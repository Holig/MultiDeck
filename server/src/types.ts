export type Platform = 'twitter' | 'youtube' | 'tiktok' | 'instagram' | 'bluesky' | 'threads' | 'reddit';

export type PostType = 'tweet' | 'video' | 'short' | 'reel' | 'post' | 'tiktok';

export type BrowserEngine = 'chromium' | 'firefox' | 'webkit';

export interface SocialAuthor {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  verified?: boolean;
  profileUrl?: string;
  subscribersOrFollowers?: string;
}

export interface SocialMedia {
  type: 'image' | 'video' | 'embed' | 'gif';
  url: string;
  previewUrl?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5';
  duration?: string;
  altText?: string;
  embedId?: string; // ID pour intégration iframe (ex: YouTube video ID)
}

export interface SocialStats {
  likes: number;
  comments?: number;
  sharesOrRetweets?: number;
  views?: number;
}

export interface QuotedPost {
  id: string;
  author: SocialAuthor;
  text: string;
  createdAt?: string;
  media?: SocialMedia[];
  postUrl?: string;
}

export interface SocialPost {
  id: string;
  platform: Platform;
  type: PostType;
  author: SocialAuthor;
  title?: string;
  text: string;
  createdAt: string;
  stats: SocialStats;
  media?: SocialMedia[];
  postUrl: string;
  embedHtml?: string;
  isLiked?: boolean;
  isSaved?: boolean;
  extra?: Record<string, any>;
  quotedPost?: QuotedPost;
  retweetedBy?: {
    name: string;
    username?: string;
  };
  replyTo?: {
    id: string;
    author?: SocialAuthor;
    text?: string;
  };
  uri?: string; // URI AT Protocol (ex: at://did:.../app.bsky.feed.post/...)
}

export interface FeedResponse {
  platform: Platform;
  posts: SocialPost[];
  source: 'live' | 'cache' | 'demo';
  cachedAt?: string;
  message?: string;
  nextCursor?: string;
}

export interface ThreadResponse {
  platform: Platform;
  focusedPost: SocialPost;
  ancestors: SocialPost[];
  replies: SocialPost[];
  source: 'live' | 'cache' | 'demo';
  message?: string;
}

export interface PlatformAuthStatus {
  isAuthenticated: boolean;
  isBrowserOpen: boolean;
  username?: string;
  avatarUrl?: string;
  cookiesDetected: boolean;
  engine?: BrowserEngine;
  lastChecked: string;
  loginError?: string;
}

export interface SystemStatus {
  twitter: PlatformAuthStatus;
  instagram: PlatformAuthStatus;
  tiktok: PlatformAuthStatus;
  youtube: PlatformAuthStatus & {
    hasApiKey: boolean;
    channelConnected?: boolean;
  };
  bluesky?: PlatformAuthStatus;
  threads?: PlatformAuthStatus;
  reddit?: PlatformAuthStatus;
}

export type ColumnContentType = 'home' | 'search' | 'user' | 'shorts' | 'trending' | 'list';

export type ColumnWidth = 'sm' | 'md' | 'lg';

export type FeedMode = 'for_you' | 'following_latest' | 'following_top' | 'sub_all' | 'sub_videos' | 'sub_shorts';

export interface ColumnConfig {
  id: string;
  platform: Platform;
  contentType: ColumnContentType;
  feedMode?: FeedMode;
  title: string;
  query?: string;
  username?: string;
  width: ColumnWidth;
  refreshInterval: number; // en secondes
  filterKeyword?: string;
  isPaused?: boolean;
}
