using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace MultiDeckLauncher
{
    static class Program
    {
        private static NotifyIcon _trayIcon;
        private static ContextMenuStrip _trayMenu;
        private static Process _serverProcess;
        private static string _appUrl = "http://localhost:3001";
        private static Mutex _mutex;
        private static string _baseDir;
        private static string _serverDir;
        private static string _runtimeInfoFile;
        private static string _logFile;

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            // 1. Vérification d'instance unique (Mutex)
            bool isFirstInstance;
            _mutex = new Mutex(true, "MultiDeck_Single_Instance_Mutex", out isFirstInstance);

            _baseDir = AppDomain.CurrentDomain.BaseDirectory;
            // Si on est dans launcher/ ou dans la racine
            if (Directory.Exists(Path.Combine(_baseDir, "server")))
            {
                _serverDir = Path.Combine(_baseDir, "server");
            }
            else if (Directory.Exists(Path.Combine(_baseDir, "..", "server")))
            {
                _serverDir = Path.GetFullPath(Path.Combine(_baseDir, "..", "server"));
                _baseDir = Path.GetFullPath(Path.Combine(_baseDir, ".."));
            }
            else
            {
                _serverDir = _baseDir;
            }

            _runtimeInfoFile = Path.Combine(_serverDir, "runtime-info.json");
            _logFile = Path.Combine(_serverDir, "multideck.log");

            if (!isFirstInstance)
            {
                // Si l'application tourne déjà, on ouvre juste le navigateur sur l'URL active
                string activeUrl = GetActiveUrlFromRuntime();
                try
                {
                    Process.Start(new ProcessStartInfo(activeUrl) { UseShellExecute = true });
                }
                catch { }
                return;
            }

            // 2. Gestion de la fermeture propre de l'application
            AppDomain.CurrentDomain.ProcessExit += (s, e) => StopServer();
            Application.ApplicationExit += (s, e) => StopServer();

            // 3. Initialisation de l'icône Tray
            InitializeTray();

            // 4. Démarrage du serveur Node.js en arrière-plan
            StartNodeServer();

            // 5. Attente du démarrage et ouverture automatique du navigateur
            Task.Run(async () =>
            {
                bool isReady = await WaitForServerReadyAsync(30);
                if (isReady)
                {
                    _appUrl = GetActiveUrlFromRuntime();
                    try
                    {
                        Process.Start(new ProcessStartInfo(_appUrl) { UseShellExecute = true });
                    }
                    catch (Exception ex)
                    {
                        ShowNotification("MultiDeck", "Impossible d'ouvrir le navigateur : " + ex.Message, ToolTipIcon.Warning);
                    }

                    ShowNotification("MultiDeck est prêt ! 🚀", "Accessible sur " + _appUrl + "\nDouble-cliquez sur cette icône à tout moment.", ToolTipIcon.Info);
                    UpdateTrayMenuText();
                }
                else
                {
                    ShowNotification("MultiDeck", "Le serveur a mis du temps à démarrer. Consultez les logs.", ToolTipIcon.Error);
                }
            });

            Application.Run();
        }

        private static void InitializeTray()
        {
            _trayMenu = new ContextMenuStrip();
            _trayMenu.Font = new Font("Segoe UI", 9F, FontStyle.Regular);

            var openItem = new ToolStripMenuItem("🌐 Ouvrir MultiDeck", null, (s, e) => OpenBrowser())
            {
                Font = new Font("Segoe UI", 9F, FontStyle.Bold)
            };
            var copyItem = new ToolStripMenuItem("📋 Copier le lien local", null, (s, e) => CopyUrlToClipboard());
            var clearCacheItem = new ToolStripMenuItem("🧹 Purger le cache", null, async (s, e) => await ClearCacheAsync());
            var logsItem = new ToolStripMenuItem("📄 Voir les logs", null, (s, e) => OpenLogs());
            var separator = new ToolStripSeparator();
            var quitItem = new ToolStripMenuItem("🚪 Quitter MultiDeck", null, (s, e) => QuitApplication());

            _trayMenu.Items.AddRange(new ToolStripItem[] {
                openItem,
                copyItem,
                new ToolStripSeparator(),
                clearCacheItem,
                logsItem,
                separator,
                quitItem
            });

            _trayIcon = new NotifyIcon
            {
                Text = "MultiDeck — Tableau de bord Social",
                ContextMenuStrip = _trayMenu,
                Visible = true
            };

            // Chargement ou génération de l'icône
            Icon customIcon = LoadOrGenerateIcon();
            _trayIcon.Icon = customIcon;
            _trayIcon.DoubleClick += (s, e) => OpenBrowser();
        }

        private static Icon LoadOrGenerateIcon()
        {
            string iconPath = Path.Combine(_baseDir, "assets", "icon.ico");
            if (File.Exists(iconPath))
            {
                try { return new Icon(iconPath); } catch { }
            }

            // Génération dynamique de l'icône MultiDeck (Layers gradient)
            try
            {
                using (Bitmap bmp = new Bitmap(32, 32))
                using (Graphics g = Graphics.FromImage(bmp))
                {
                    g.SmoothingMode = SmoothingMode.AntiAlias;
                    using (GraphicsPath path = new GraphicsPath())
                    {
                        path.AddArc(0, 0, 16, 16, 180, 90);
                        path.AddArc(16, 0, 16, 16, 270, 90);
                        path.AddArc(16, 16, 16, 16, 0, 90);
                        path.AddArc(0, 16, 16, 16, 90, 90);
                        path.CloseFigure();

                        using (LinearGradientBrush brush = new LinearGradientBrush(
                            new PointF(0, 32),
                            new PointF(32, 0),
                            Color.FromArgb(29, 155, 240),
                            Color.FromArgb(236, 72, 153)))
                        {
                            g.FillPath(brush, path);
                        }
                    }

                    using (Pen pen = new Pen(Color.White, 2.2f))
                    {
                        pen.StartCap = LineCap.Round;
                        pen.EndCap = LineCap.Round;
                        pen.LineJoin = LineJoin.Round;

                        // Couche 1
                        PointF[] d1 = new PointF[] {
                            new PointF(16f, 7f),
                            new PointF(24f, 11f),
                            new PointF(16f, 15f),
                            new PointF(8f, 11f)
                        };
                        g.DrawPolygon(pen, d1);

                        // Couche 2
                        PointF[] d2 = new PointF[] {
                            new PointF(8f, 15.5f),
                            new PointF(16f, 19.5f),
                            new PointF(24f, 15.5f)
                        };
                        g.DrawLines(pen, d2);

                        // Couche 3
                        PointF[] d3 = new PointF[] {
                            new PointF(8f, 20f),
                            new PointF(16f, 24f),
                            new PointF(24f, 20f)
                        };
                        g.DrawLines(pen, d3);
                    }
                    IntPtr hIcon = bmp.GetHicon();
                    return Icon.FromHandle(hIcon);
                }
            }
            catch
            {
                return SystemIcons.Application;
            }
        }

        private static void StartNodeServer()
        {
            try
            {
                string serverScript = Path.Combine(_serverDir, "dist", "index.js");
                if (!File.Exists(serverScript))
                {
                    // Essai alternatif si lancé en développement
                    serverScript = Path.Combine(_serverDir, "src", "index.ts");
                }

                // Recherche de node.exe (local ou dans le PATH)
                string nodeExe = "node.exe";
                string localNode = Path.Combine(_baseDir, "node", "node.exe");
                if (File.Exists(localNode))
                {
                    nodeExe = localNode;
                }

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = nodeExe,
                    Arguments = "\"" + serverScript + "\"",
                    WorkingDirectory = _serverDir,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    WindowStyle = ProcessWindowStyle.Hidden
                };

                _serverProcess = new Process { StartInfo = psi };

                // Redirection des logs dans multideck.log
                _serverProcess.OutputDataReceived += (s, e) => { if (e.Data != null) AppendLog("[STDOUT] " + e.Data); };
                _serverProcess.ErrorDataReceived += (s, e) => { if (e.Data != null) AppendLog("[STDERR] " + e.Data); };

                _serverProcess.Start();
                _serverProcess.BeginOutputReadLine();
                _serverProcess.BeginErrorReadLine();
                AppendLog("[LAUNCHER] Serveur MultiDeck démarré avec le PID " + _serverProcess.Id);
            }
            catch (Exception ex)
            {
                AppendLog("[LAUNCHER ERROR] " + ex.Message);
                MessageBox.Show("Erreur au lancement de MultiDeck :\n" + ex.Message + "\n\nVérifiez que Node.js est installé.", "Erreur MultiDeck", MessageBoxButtons.OK, MessageBoxIcon.Error);
                QuitApplication();
            }
        }

        private static async Task<bool> WaitForServerReadyAsync(int timeoutSeconds)
        {
            using (HttpClient client = new HttpClient { Timeout = TimeSpan.FromSeconds(2) })
            {
                DateTime deadline = DateTime.Now.AddSeconds(timeoutSeconds);
                while (DateTime.Now < deadline)
                {
                    if (File.Exists(_runtimeInfoFile))
                    {
                        string activeUrl = GetActiveUrlFromRuntime();
                        try
                        {
                            var response = await client.GetAsync(activeUrl + "/health");
                            if (response.IsSuccessStatusCode) return true;
                        }
                        catch { }
                    }

                    try
                    {
                        var response = await client.GetAsync("http://localhost:3001/health");
                        if (response.IsSuccessStatusCode) return true;
                    }
                    catch { }

                    await Task.Delay(500);
                }
            }
            return false;
        }

        private static string GetActiveUrlFromRuntime()
        {
            if (File.Exists(_runtimeInfoFile))
            {
                try
                {
                    string content = File.ReadAllText(_runtimeInfoFile);
                    int urlIdx = content.IndexOf("\"url\":");
                    if (urlIdx >= 0)
                    {
                        int startQuote = content.IndexOf("\"", urlIdx + 6);
                        int endQuote = content.IndexOf("\"", startQuote + 1);
                        if (startQuote >= 0 && endQuote > startQuote)
                        {
                            return content.Substring(startQuote + 1, endQuote - startQuote - 1);
                        }
                    }
                }
                catch { }
            }
            return _appUrl;
        }

        private static void UpdateTrayMenuText()
        {
            if (_trayIcon != null)
            {
                _trayIcon.Text = "MultiDeck (" + _appUrl + ")";
            }
        }

        private static void OpenBrowser()
        {
            string url = GetActiveUrlFromRuntime();
            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                ShowNotification("MultiDeck", "Erreur lors de l'ouverture du navigateur : " + ex.Message, ToolTipIcon.Error);
            }
        }

        private static void CopyUrlToClipboard()
        {
            string url = GetActiveUrlFromRuntime();
            Clipboard.SetText(url);
            ShowNotification("MultiDeck", "Lien copié dans le presse-papier :\n" + url, ToolTipIcon.Info);
        }

        private static async Task ClearCacheAsync()
        {
            string url = GetActiveUrlFromRuntime();
            try
            {
                using (HttpClient client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) })
                {
                    var response = await client.PostAsync(url + "/api/feed/clear-cache", new StringContent("{}", Encoding.UTF8, "application/json"));
                    if (response.IsSuccessStatusCode)
                    {
                        ShowNotification("MultiDeck Cache", "Le cache mémoire et disque a été purgé avec succès ! ✨", ToolTipIcon.Info);
                    }
                    else
                    {
                        ShowNotification("MultiDeck Cache", "Erreur lors de la purge du cache.", ToolTipIcon.Warning);
                    }
                }
            }
            catch (Exception ex)
            {
                ShowNotification("MultiDeck Cache", "Erreur de communication : " + ex.Message, ToolTipIcon.Error);
            }
        }

        private static void OpenLogs()
        {
            if (File.Exists(_logFile))
            {
                Process.Start(new ProcessStartInfo("notepad.exe", "\"" + _logFile + "\"") { UseShellExecute = true });
            }
            else
            {
                ShowNotification("Logs", "Aucun fichier de log disponible pour le moment.", ToolTipIcon.Info);
            }
        }

        private static void ShowNotification(string title, string text, ToolTipIcon icon)
        {
            if (_trayIcon != null)
            {
                _trayIcon.ShowBalloonTip(3000, title, text, icon);
            }
        }

        private static void AppendLog(string message)
        {
            try
            {
                string line = string.Format("[{0:yyyy-MM-dd HH:mm:ss}] {1}{2}", DateTime.Now, message, Environment.NewLine);
                File.AppendAllText(_logFile, line);
            }
            catch { }
        }

        private static void StopServer()
        {
            try
            {
                if (_serverProcess != null && !_serverProcess.HasExited)
                {
                    AppendLog("[LAUNCHER] Arrêt du processus serveur...");
                    // Arrêt forcé de l'arbre des processus Node et Playwright
                    var killProc = Process.Start(new ProcessStartInfo
                    {
                        FileName = "taskkill",
                        Arguments = "/F /T /PID " + _serverProcess.Id,
                        CreateNoWindow = true,
                        UseShellExecute = false
                    });
                    if (killProc != null) killProc.WaitForExit(3000);
                }
            }
            catch { }

            if (_trayIcon != null)
            {
                _trayIcon.Visible = false;
                _trayIcon.Dispose();
                _trayIcon = null;
            }
        }

        private static void QuitApplication()
        {
            StopServer();
            Application.Exit();
            Environment.Exit(0);
        }
    }
}
