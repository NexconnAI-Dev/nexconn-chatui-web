import {
  BaseChannel, ChannelIdentifier, ChannelType, CommunitySubChannel,
  CommunitySubChannelIdentifier, DirectChannel, GroupChannel, NCEngine, SystemChannel,
} from '@nexconn/chat';

/** Validate channel parameters. */
export const isInvalidChannel = (identifier: ChannelIdentifier): boolean => {
  if (!identifier) {
    return true;
  }
  if (!(identifier instanceof ChannelIdentifier)) {
    return true;
  }
  const validChannelTypes: ChannelType[] = [ChannelType.DIRECT, ChannelType.GROUP, ChannelType.SYSTEM];
  return !validChannelTypes.includes(identifier.channelType);
};

export const trans2ChannelKey = (
  channelIdentifier: ChannelIdentifier
): string => channelIdentifier instanceof CommunitySubChannelIdentifier
  ? `[${channelIdentifier.channelType}][${channelIdentifier.channelId}][${channelIdentifier.subChannelId}]`
  : `[${channelIdentifier.channelType}][${channelIdentifier.channelId}][]`;

export const isDirectChannelOrGroupChannel = (channelIdentifier: ChannelIdentifier): boolean => {
  const channelType = channelIdentifier.channelType;
  return channelType === ChannelType.DIRECT || channelType === ChannelType.GROUP;
}

export const formatTime = (time: number): {
  year: string, month: string, day: string, hour: string, minute: string, weekDay: number,
} => {
  if (!time) time = Date.now();
  const date = new Date(time);
  const year = `${date.getFullYear()}`;
  const month = `${date.getMonth() + 1}`;
  const day = `${date.getDate()}`;
  const weekDay = date.getDay();

  let hour = `${date.getHours()}`;
  if (hour.length < 2) {
    hour = `0${hour}`;
  }
  let minute = `${date.getMinutes()}`;
  if (minute.length < 2) {
    minute = `0${minute}`;
  }

  return {
    year, month, day, hour, minute, weekDay,
  };
};

/**
 * Format a duration in seconds.
 */
export const formatTimeLength = (time: number): string => {
  const minutes = Math.floor(time / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (time < 60) return `0:${time.toString().padStart(2, '0')}`;
  time = Math.floor(time)

  return `${days > 0 ? `${days}d ` : ''}${
    hours > 0 ? `${(hours % 24).toString().padStart(2, '0').trim()}:` : ''}${
    minutes > 0 ? `${(minutes % 60).toString().padStart(2, '0')}:` : ''}${
    (time % 60).toString().padStart(2, '0')}`.trim();
};

/**
 * Format a file size.
 * @param bytes - File size in bytes
 * @returns
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return bytes + " B";
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + " KB";
  } else if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  } else if (bytes < 1024 * 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  } else {
    return (bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2) + " TB";
  }
}

/**
 * Shorten a filename by preserving its start and end.
 * Desktop defaults: maximum length 40, ending length 8.
 * Mobile defaults: maximum length 10, ending length 4.
 * @param maxLength - Maximum length
 * @param endLength - Preserved ending length
 * @param name - File name
 */
export const formatFileName = (name: string, maxLength: number = 40, endLength: number = 8): string => {
  if (!name || name.length <= maxLength) return name;
  const startLength = maxLength - endLength - 3;
  if (startLength <= 0) return name;
  return `${name.slice(0, startLength)}...${name.slice(-endLength)}`;
};

export const formatBase64Image = (base64: string) => {
  if (!base64) return
  const reg = /data:image\/[^;]+;base64,/;
  return reg.test(base64) ? base64 : `data:image/png;base64,${base64}`;
}

/**
 * Match URLs that include a protocol.
 * Supported patterns:
 * 1. Protocol + domain + port + path
 * 2. Protocol + IP address + port + path
 * 3. Protocol + localhost + port + path
 * @param content
 * @returns
 */
export const formatTxtMessageContent = (content: string) => {
  const ipReg = '(?:(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]\\d|\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]\\d|\\d)';
  const hostReg = '(?!@)(?:[a-z0-9-@_]{1,36}\\.)+[a-z]{2,6}';
  const portReg = '(?:\\:\\d{1,5})?';
  const localhost = '(?:localhost)';
  const pathReg = '(?:(?:/[a-zA-Z0-9.,;?\\\'+&%$#=~_\\-!()*\\|\\/]*)?)';
  const urlRegex = new RegExp('(((https?):\/\/(?:(' + ipReg + ')|(' + hostReg + ')|' + localhost + ')' + portReg + pathReg + '))','ig');
  const mailRegex = new RegExp('([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)','ig');

  type TxtMatch = { type: string; val: string; index: number };
  const conform2rule: TxtMatch[] = [];
  let urlExec: RegExpExecArray | null;
  const urlRe = new RegExp(urlRegex.source, urlRegex.flags);
  while ((urlExec = urlRe.exec(content)) !== null) {
    conform2rule.push({ type: 'url', val: urlExec[0], index: urlExec.index });
    if (urlExec[0].length === 0 && urlRe.lastIndex === urlExec.index) {
      urlRe.lastIndex++;
    }
  }
  let mailExec: RegExpExecArray | null;
  const mailRe = new RegExp(mailRegex.source, mailRegex.flags);
  while ((mailExec = mailRe.exec(content)) !== null) {
    conform2rule.push({ type: 'mail', val: mailExec[0], index: mailExec.index });
    if (mailExec[0].length === 0 && mailRe.lastIndex === mailExec.index) {
      mailRe.lastIndex++;
    }
  }

  conform2rule.sort((a, b) => a.index - b.index || b.val.length - a.val.length);
  const merged: TxtMatch[] = [];
  let occupiedEnd = -1;
  for (const m of conform2rule) {
    if (m.index < occupiedEnd) {
      continue;
    }
    merged.push(m);
    occupiedEnd = m.index + m.val.length;
  }

  if (merged.length <= 0) {
    return {
      type: 0,
      content: [{content, type: 'text'}],
      position: []
    };
  }

  const recognizedContent = [];
  let currentPosition = 0;
  const positions: number[] = [];

  merged.forEach((match) => {
    const splitIndex = match.index;
    if (splitIndex < currentPosition) {
      return;
    }
    if (splitIndex > currentPosition) {
      recognizedContent.push({
        content: content.substring(currentPosition, splitIndex),
        type: 'text'
      });
    }
    recognizedContent.push({
      content: match.val.trim(),
      type: match.type
    });
    positions.push(recognizedContent.length);
    currentPosition = splitIndex + match.val.length;
  });


  if (currentPosition < content.length) {
    recognizedContent.push({
      content: content.substring(currentPosition),
      type: 'text',
    });
  }

  return {
    type: 1,
    content: recognizedContent,
    position: positions
  };
}

export function findLastIndex<T>(array: Array<T>, predicate: (item: T) => boolean): number {
  let l = array.length;
  for (let i = l - 1; i > -1; i--) {
    if (predicate(array[i])) {
      return i;
    }
  }
  return -1;
}

/**
 * Check whether the current viewport is mobile width (<= 768px).
 * @returns {boolean} Whether the viewport is mobile width
 */
export const isMobileDevice = (): boolean => {
  return typeof window !== 'undefined' && window.innerWidth <= 768;
};

export { clone } from './clone';
export { createScrollControl } from './scrollControl';

export const getServerTime = (): number => {
  return Date.now() - NCEngine.getServerTimeDelta()
}

/**
 * Create a Channel object from a channel identifier.
 * @param channelIdentifier - Channel identifier
 * @returns Channel object, or null for unsupported channel types
 */
export const createNexconnChannel = (channelIdentifier: ChannelIdentifier): BaseChannel | null => {
  const { channelType, channelId } = channelIdentifier;

  switch (channelType) {
    case ChannelType.DIRECT:
      return new DirectChannel(channelId);
    case ChannelType.GROUP:
      return new GroupChannel(channelId);
    case ChannelType.SYSTEM:
      return new SystemChannel(channelId);
    case ChannelType.COMMUNITY:
      return new CommunitySubChannel(channelId, (channelIdentifier as CommunitySubChannelIdentifier).subChannelId)
    default:
      return null;
  }
}
