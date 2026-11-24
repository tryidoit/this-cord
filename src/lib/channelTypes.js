import {
  Hash,
  Megaphone,
  Volume2,
  Radio,
  MessageSquare,
  Image,
  ScrollText,
  GitBranch,
} from "lucide-react";

export const CHANNEL_TYPES = {
  text: {
    label: "Text",
    icon: Hash,
    description: "Send messages, images, GIFs, opinions, and puns",
    color: "text-muted-foreground",
  },
  announcement: {
    label: "Announcement",
    icon: Megaphone,
    description: "Important updates — only moderators can post",
    color: "text-warning",
  },
  voice: {
    label: "Voice",
    icon: Volume2,
    description: "Hang out together with voice",
    color: "text-info",
  },
  stage: {
    label: "Stage",
    icon: Radio,
    description: "Broadcast to large audiences with speaker controls",
    color: "text-success",
  },
  forum: {
    label: "Forum",
    icon: MessageSquare,
    description: "Organized posts with tags and guidelines",
    color: "text-primary",
  },
  media: {
    label: "Media",
    icon: Image,
    description: "Share photos and videos in a gallery layout",
    color: "text-accent-foreground",
  },
  rules: {
    label: "Rules",
    icon: ScrollText,
    description: "Display server rules prominently",
    color: "text-danger",
  },
  thread: {
    label: "Thread",
    icon: GitBranch,
    description: "A temporary or permanent conversation branch",
    color: "text-muted-foreground",
  },
};

export const CHANNEL_TYPE_ORDER = [
  "announcement",
  "text",
  "forum",
  "media",
  "voice",
  "stage",
  "rules",
];

export const ARCHIVE_DURATIONS = [
  { label: "1 Hour", value: 60 },
  { label: "24 Hours", value: 1440 },
  { label: "3 Days", value: 4320 },
  { label: "7 Days", value: 10080 },
];

export function getChannelType(type) {
  return CHANNEL_TYPES[type] || CHANNEL_TYPES.text;
}

export function isThreadArchived(channel) {
  if (!channel?.auto_archive_duration || !channel?.last_activity_at) return false;
  const lastActivity = new Date(channel.last_activity_at).getTime();
  const archiveMs = channel.auto_archive_duration * 60 * 1000;
  return Date.now() - lastActivity > archiveMs;
}

export function getArchiveTimeRemaining(channel) {
  if (!channel?.auto_archive_duration || !channel?.last_activity_at) return 0;
  const lastActivity = new Date(channel.last_activity_at).getTime();
  const archiveMs = channel.auto_archive_duration * 60 * 1000;
  return Math.max(0, archiveMs - (Date.now() - lastActivity));
}

export const SLOWMODE_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "5 seconds", value: 5 },
  { label: "10 seconds", value: 10 },
  { label: "15 seconds", value: 15 },
  { label: "30 seconds", value: 30 },
  { label: "1 minute", value: 60 },
  { label: "5 minutes", value: 300 },
  { label: "10 minutes", value: 600 },
  { label: "1 hour", value: 3600 },
];