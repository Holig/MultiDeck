import sys
import os
import json
import base64
import shutil
import sqlite3
import tempfile
import ctypes
from ctypes import wintypes

# Windows Crypt32 DPAPI
class DATA_BLOB(ctypes.Structure):
    _fields_ = [
        ('cbData', wintypes.DWORD),
        ('pbData', ctypes.POINTER(ctypes.c_char))
    ]

def decrypt_dpapi(encrypted_bytes):
    try:
        blob_in = DATA_BLOB(len(encrypted_bytes), ctypes.cast(encrypted_bytes, ctypes.POINTER(ctypes.c_char)))
        blob_out = DATA_BLOB()
        if ctypes.windll.crypt32.CryptUnprotectData(ctypes.byref(blob_in), None, None, None, None, 0, ctypes.byref(blob_out)):
            out = ctypes.string_at(blob_out.pbData, blob_out.cbData)
            ctypes.windll.kernel32.LocalFree(blob_out.pbData)
            return out
    except Exception:
        pass
    return None

# Windows BCrypt AES-256-GCM
class BCRYPT_AUTHENTICATED_CIPHER_MODE_INFO(ctypes.Structure):
    _fields_ = [
        ('cbSize', wintypes.ULONG),
        ('dwInfoVersion', wintypes.ULONG),
        ('pbNonce', ctypes.POINTER(ctypes.c_char)),
        ('cbNonce', wintypes.ULONG),
        ('pbAuthData', ctypes.POINTER(ctypes.c_char)),
        ('cbAuthData', wintypes.ULONG),
        ('pbTag', ctypes.POINTER(ctypes.c_char)),
        ('cbTag', wintypes.ULONG),
        ('pbMacContext', ctypes.POINTER(ctypes.c_char)),
        ('cbMacContext', wintypes.ULONG),
        ('cbAAD', wintypes.ULONG),
        ('cbData', ctypes.c_ulonglong),
        ('dwFlags', wintypes.ULONG),
    ]

def decrypt_aes_gcm(key, iv, ciphertext, tag):
    try:
        bcrypt = ctypes.windll.bcrypt
        hAlg = wintypes.HANDLE()
        BCRYPT_AES_ALGORITHM = "AES"
        BCRYPT_CHAIN_MODE_GCM = "ChainingModeGCM"
        
        if bcrypt.BCryptOpenAlgorithmProvider(ctypes.byref(hAlg), BCRYPT_AES_ALGORITHM, None, 0) != 0:
            return None
        
        chain_mode_buf = ctypes.create_unicode_buffer(BCRYPT_CHAIN_MODE_GCM)
        if bcrypt.BCryptSetProperty(hAlg, "ChainingMode", chain_mode_buf, ctypes.sizeof(chain_mode_buf), 0) != 0:
            bcrypt.BCryptCloseAlgorithmProvider(hAlg, 0)
            return None
        
        hKey = wintypes.HANDLE()
        key_buf = (ctypes.c_char * len(key)).from_buffer_copy(key)
        if bcrypt.BCryptGenerateSymmetricKey(hAlg, ctypes.byref(hKey), None, 0, key_buf, len(key), 0) != 0:
            bcrypt.BCryptCloseAlgorithmProvider(hAlg, 0)
            return None
        
        auth_info = BCRYPT_AUTHENTICATED_CIPHER_MODE_INFO()
        auth_info.cbSize = ctypes.sizeof(BCRYPT_AUTHENTICATED_CIPHER_MODE_INFO)
        auth_info.dwInfoVersion = 1
        
        iv_buf = (ctypes.c_char * len(iv)).from_buffer_copy(iv)
        auth_info.pbNonce = ctypes.cast(iv_buf, ctypes.POINTER(ctypes.c_char))
        auth_info.cbNonce = len(iv)
        
        tag_buf = (ctypes.c_char * len(tag)).from_buffer_copy(tag)
        auth_info.pbTag = ctypes.cast(tag_buf, ctypes.POINTER(ctypes.c_char))
        auth_info.cbTag = len(tag)
        
        cipher_buf = (ctypes.c_char * len(ciphertext)).from_buffer_copy(ciphertext)
        plain_buf = (ctypes.c_char * len(ciphertext))()
        cbPlain = wintypes.ULONG()
        
        status = bcrypt.BCryptDecrypt(
            hKey,
            cipher_buf,
            len(ciphertext),
            ctypes.byref(auth_info),
            None,
            0,
            plain_buf,
            len(ciphertext),
            ctypes.byref(cbPlain),
            0
        )
        
        bcrypt.BCryptDestroyKey(hKey)
        bcrypt.BCryptCloseAlgorithmProvider(hAlg, 0)
        
        if status == 0:
            return bytes(plain_buf[:cbPlain.value]).decode('utf-8', errors='ignore')
    except Exception:
        pass
    return None

def decrypt_chrome_cookie(val_bytes, master_key):
    if not val_bytes or len(val_bytes) < 31:
        return ""
    if val_bytes[:3] in (b'v10', b'v11'):
        iv = val_bytes[3:15]
        tag = val_bytes[-16:]
        ciphertext = val_bytes[15:-16]
        return decrypt_aes_gcm(master_key, iv, ciphertext, tag) or ""
    # Fallback direct DPAPI
    dec = decrypt_dpapi(val_bytes)
    if dec:
        return dec.decode('utf-8', errors='ignore')
    return ""

def get_platform_for_domain(domain):
    dom = (domain or '').lower()
    if 'x.com' in dom or 'twitter.com' in dom:
        return 'twitter'
    if 'instagram.com' in dom:
        return 'instagram'
    if 'tiktok.com' in dom:
        return 'tiktok'
    if 'youtube.com' in dom or 'google.com' in dom:
        return 'youtube'
    return None

def extract_firefox_cookies():
    appdata = os.environ.get('APPDATA', '')
    ff_profiles = os.path.join(appdata, 'Mozilla', 'Firefox', 'Profiles')
    results = {'twitter': [], 'instagram': [], 'tiktok': [], 'youtube': []}
    sources = {}

    if not os.path.exists(ff_profiles):
        return results, sources

    try:
        for prof in os.listdir(ff_profiles):
            db_path = os.path.join(ff_profiles, prof, 'cookies.sqlite')
            if not os.path.exists(db_path):
                continue
            
            tmp = tempfile.NamedTemporaryFile(delete=False)
            tmp.close()
            try:
                shutil.copy2(db_path, tmp.name)
                conn = sqlite3.connect(tmp.name)
                c = conn.cursor()
                c.execute("SELECT host, name, value, path, expiry, isSecure, isHttpOnly, sameSite FROM moz_cookies")
                prof_results = {'twitter': [], 'instagram': [], 'tiktok': [], 'youtube': []}
                for host, name, value, path, expiry, isSecure, isHttpOnly, sameSite in c.fetchall():
                    target_p = get_platform_for_domain(host)
                    if target_p and value:
                        exp_val = -1
                        if expiry:
                            exp_int = int(expiry)
                            if exp_int > 10000000000:
                                exp_val = int(exp_int / 1000)
                            elif exp_int > 0:
                                exp_val = exp_int
                            if exp_val > 2147483647:
                                exp_val = 2147483647

                        cookie_obj = {
                            'name': name,
                            'value': value,
                            'domain': host,
                            'path': path or '/',
                            'expires': exp_val,
                            'secure': bool(isSecure),
                            'httpOnly': bool(isHttpOnly),
                            'sameSite': 'Lax' if sameSite == 1 else ('Strict' if sameSite == 2 else 'None')
                        }
                        prof_results[target_p].append(cookie_obj)

                for p in ['twitter', 'instagram', 'tiktok', 'youtube']:
                    if len(prof_results[p]) > len(results[p]):
                        results[p] = prof_results[p]
                        sources[p] = f"Mozilla Firefox ({prof})"

                conn.close()
            except Exception:
                pass
            finally:
                if os.path.exists(tmp.name):
                    try:
                        os.unlink(tmp.name)
                    except Exception:
                        pass
    except Exception:
        pass

    return results, sources

def extract_chromium_cookies():
    localappdata = os.environ.get('LOCALAPPDATA', '')
    appdata = os.environ.get('APPDATA', '')

    browsers = [
        ('Google Chrome', os.path.join(localappdata, 'Google', 'Chrome', 'User Data')),
        ('Microsoft Edge', os.path.join(localappdata, 'Microsoft', 'Edge', 'User Data')),
        ('Brave', os.path.join(localappdata, 'BraveSoftware', 'Brave-Browser', 'User Data')),
        ('Vivaldi', os.path.join(localappdata, 'Vivaldi', 'User Data')),
        ('Opera', os.path.join(appdata, 'Opera Software', 'Opera Stable')),
        ('Opera GX', os.path.join(appdata, 'Opera Software', 'Opera GX Stable')),
    ]

    results = {'twitter': [], 'instagram': [], 'tiktok': [], 'youtube': []}
    sources = {}

    for b_name, base_dir in browsers:
        if not os.path.exists(base_dir):
            continue

        # Master key in Local State
        master_key = None
        local_state_file = os.path.join(base_dir, 'Local State')
        if os.path.exists(local_state_file):
            try:
                with open(local_state_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                enc_key = base64.b64decode(data['os_crypt']['encrypted_key'])
                if enc_key.startswith(b'DPAPI'):
                    master_key = decrypt_dpapi(enc_key[5:])
            except Exception:
                pass

        # Profiles
        subdirs = ['Default']
        try:
            for entry in os.listdir(base_dir):
                if entry.startswith('Profile ') and entry not in subdirs:
                    subdirs.append(entry)
        except Exception:
            pass

        for sdir in subdirs:
            profile_dir = os.path.join(base_dir, sdir)
            if not os.path.isdir(profile_dir):
                continue

            possible_cookie_paths = [
                os.path.join(profile_dir, 'Network', 'Cookies'),
                os.path.join(profile_dir, 'Cookies'),
            ]

            for c_path in possible_cookie_paths:
                if not os.path.exists(c_path):
                    continue

                tmp = tempfile.NamedTemporaryFile(delete=False)
                tmp.close()
                try:
                    shutil.copy2(c_path, tmp.name)
                    conn = sqlite3.connect(tmp.name)
                    c = conn.cursor()
                    c.execute("SELECT host_key, name, value, encrypted_value, path, expires_utc, is_secure, is_httponly, samesite FROM cookies")
                    for host, name, plain_val, enc_val, path, expires_utc, is_secure, is_httponly, samesite in c.fetchall():
                        target_p = get_platform_for_domain(host)
                        if not target_p:
                            continue

                        val = plain_val
                        if not val and enc_val and master_key:
                            val = decrypt_chrome_cookie(enc_val, master_key)

                        if val:
                            exp_val = -1
                            if expires_utc:
                                if expires_utc > 11644473600000000:
                                    exp_val = int((expires_utc / 1000000) - 11644473600)
                                elif expires_utc > 10000000000:
                                    exp_val = int(expires_utc / 1000)
                                elif expires_utc > 0:
                                    exp_val = int(expires_utc)
                                if exp_val > 2147483647:
                                    exp_val = 2147483647

                            cookie_obj = {
                                'name': name,
                                'value': val,
                                'domain': host,
                                'path': path or '/',
                                'expires': exp_val,
                                'secure': bool(is_secure),
                                'httpOnly': bool(is_httponly),
                                'sameSite': 'Lax' if samesite == 1 else ('Strict' if samesite == 2 else 'None')
                            }
                            results[target_p].append(cookie_obj)
                            sources[target_p] = f"{b_name} ({sdir})"
                    conn.close()
                except Exception:
                    pass
                finally:
                    if os.path.exists(tmp.name):
                        try:
                            os.unlink(tmp.name)
                        except Exception:
                            pass

    return results, sources

def is_valid_session(platform, cookies):
    names = {c['name']: c['value'] for c in cookies}
    if platform == 'twitter':
        return ('auth_token' in names and len(names['auth_token']) > 5) or 'ct0' in names
    if platform == 'instagram':
        return ('sessionid' in names and len(names['sessionid']) > 3) or 'ds_user_id' in names
    if platform == 'tiktok':
        return ('sessionid' in names and len(names['sessionid']) > 3) or 'sid_tt' in names or 'sessionid_ss' in names
    if platform == 'youtube':
        return 'LOGIN_INFO' in names or 'SAPISID' in names or 'SID' in names or '__Secure-1PSID' in names
    return False

def main():
    target_platform = sys.argv[1] if len(sys.argv) > 1 else 'all'
    target_engine = sys.argv[2] if len(sys.argv) > 2 else 'all'

    final_results = {'twitter': [], 'instagram': [], 'tiktok': [], 'youtube': []}
    final_sources = {}
    all_platforms = ['twitter', 'instagram', 'tiktok', 'youtube']

    # Extract according to engine
    if target_engine in ('all', 'firefox'):
        ff_res, ff_sources = extract_firefox_cookies()
        for p in all_platforms:
            if is_valid_session(p, ff_res[p]):
                final_results[p] = ff_res[p]
                final_sources[p] = ff_sources.get(p, 'Firefox')

    if target_engine in ('all', 'chromium'):
        cr_res, cr_sources = extract_chromium_cookies()
        for p in all_platforms:
            if not final_results[p] and is_valid_session(p, cr_res[p]):
                final_results[p] = cr_res[p]
                final_sources[p] = cr_sources.get(p, 'Chromium')

    output = {}
    platforms = [target_platform] if target_platform in all_platforms else all_platforms

    for p in platforms:
        cookies = final_results.get(p, [])
        valid = is_valid_session(p, cookies)
        if valid and p == 'youtube':
            has_socs = any(c.get('name') == 'SOCS' for c in cookies)
            if not has_socs:
                cookies.append({
                    'name': 'SOCS',
                    'value': 'CAESEwgDEgk2NTY5MTA2MTkaAmZyIAEaBgiA_L20Bg',
                    'domain': '.youtube.com',
                    'path': '/',
                    'expires': 1893456000,
                    'secure': True,
                    'httpOnly': False,
                    'sameSite': 'Lax'
                })
        output[p] = {
            'success': valid,
            'browserName': final_sources.get(p, 'Inconnu') if valid else None,
            'cookiesCount': len(cookies) if valid else 0,
            'cookies': cookies if valid else [],
            'message': f"Session {p.upper()} détectée avec succès depuis {final_sources.get(p, 'navigateur')} ({len(cookies)} cookies) !" if valid else f"Aucune session {p.upper()} active trouvée."
        }

    print(json.dumps(output))

if __name__ == '__main__':
    main()
