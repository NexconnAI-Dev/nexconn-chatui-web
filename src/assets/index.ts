import groupProfile from './icon/group-portrait.svg?raw';
import userProfile from './icon/user-portrait.svg?raw';
import systemProfile from './icon/system-portrait.svg?raw';

import notification from './icon/notification.svg?raw';
import topIcon from './icon/top.svg?raw';
import checked from './icon/checked.svg?raw';
import search from './icon/search.svg?raw';
import triangle from './icon/triangle.svg?raw';

import modalClose from './icon/modal/close.svg?raw';
import modalDownload from './icon/modal/download.svg?raw';
import modalUp from './icon/modal/up.svg?raw';
import modalDown from './icon/modal/down.svg?raw';
import takePhotoSendIcon from './icon/take-photo/send.svg?raw';

import inputPhotoIcon from './icon/input/icon-photo.svg?raw';
import inputImageIcon from './icon/input/icon-images.svg?raw';
import inputEmojiIcon from './icon/input/icon-emoji.svg?raw';
import inputPlusIcon from './icon/input/icon-plus.svg?raw';
import inputFilesIcon from './icon/input/icon-files.svg?raw';
import inputSendIcon from './icon/input/send.svg?raw';
import EmojiPanelEmojiBtnIcon from './icon/input/emoji-pannel-emoji.svg?raw';

import convMenuTopIcon from './icon/conversation-menu/top.svg?raw';
import convMenuUnTopIcon from './icon/conversation-menu/untop.svg?raw';
import convMenuUnmuteIcon from './icon/conversation-menu/unmute.svg?raw';
import convMenuMuteIcon from './icon/conversation-menu/mute.svg?raw';
import convMenuDeleteIcon from './icon/conversation-menu/delete.svg?raw';

import MsgMenuDeleteIcon from './icon/message-menu/delete.svg?raw';
import MsgMenuCopyIcon from './icon/message-menu/copy.svg?raw';
import MsgMenuReplyIcon from './icon/message-menu/reply.svg?raw';
import MsgMenuSelectIcon from './icon/message-menu/select.svg?raw';
import MsgMenuForwardIcon from './icon/message-menu/forward.svg?raw';
import MsgMenuMergeForwardIcon from './icon/message-menu/merge-forward.svg?raw';
import MsgMenuSTTIcon from './icon/message-menu/stt.svg?raw';
import MsgMenuCancelSTTIcon from './icon/message-menu/stt-cancel.svg?raw';
import MsgMenuRecallIcon from './icon/message-menu/recall.svg?raw';
import FileTypeAudioIcon from './icon/message/file-type/audio.svg?raw';
import FileTypeExcelIcon from './icon/message/file-type/excel.svg?raw';
import FileTypeImageIcon from './icon/message/file-type/image.svg?raw';
import FileTypeOtherIcon from './icon/message/file-type/other.svg?raw';
import FileTypePdfIcon from './icon/message/file-type/pdf.svg?raw';
import FileTypePptIcon from './icon/message/file-type/ppt.svg?raw';
import FileTypeTxtIcon from './icon/message/file-type/txt.svg?raw';
import FileTypeVideoIcon from './icon/message/file-type/video.svg?raw';
import FileTypeWordIcon from './icon/message/file-type/word.svg?raw';

import ChannelsEmptyIcon from './icon/conversation-empty.svg?raw';
import GroupMembersIcon from './icon/group-members-icon.svg?raw';

import TakePhotoCancelIcon from './icon/take-photo/cancel-icon.svg?raw';
import TakePhotoRetryIcon from './icon/take-photo/retry-icon.svg?raw';
import TakePhotoCameraIcon from './icon/take-photo/camera-icon.svg?raw';

import MultiChoiceMenuCancelIcon from './icon/multi-choice-menu-cancel.svg?raw';

import AudioIcon from './icon/message/audio.svg?raw';
import AudioSelfIcon from './icon/message/audio-self.svg?raw';
import AudioStopIcon from './icon/message/audio-stop.svg?raw';
import AudioRunIcon from './icon/message/audio-run.svg?raw';
import ImageFailed from './icon/message/image-failed.svg?raw';
import PlayIcon from './icon/message/play.svg?raw';

import SentStatusFailedIcon from './icon/message/status-failed.svg?raw';
import SentStatusReadIcon from './icon/message/status-read.svg?raw';
import SentStatusUnreadIcon from './icon/message/status-unread.svg?raw';
import SentStatusSendingIcon from './icon/message/status-sending.svg?raw';
import SentStatusUnreadChatIcon from './icon/message/status-unread-chat.svg?raw';
import SentStatusSendingChatIcon from './icon/message/status-sending-chat.svg?raw';
import HoverMenuIcon from './icon/hover-menu.svg?raw';

const HoverMenuActiveIcon = HoverMenuIcon
  .replace(/#E3E7EF/g, '#D0DDFF')
  .replace(/#020814/g, '#0047FF');

  // Use #0047FF for the active send button icon.
const inputSendActiveIcon = inputSendIcon.replace(/#CCCCCC/g, '#0047FF');

const emojiHoverIcon = inputEmojiIcon
  .replace(/#F3F5FA/g, '#D0DDFF')
  .replace(/#020814/g, '#0047FF');

const imagesHoverIcon = inputImageIcon
  .replace(/#F3F5FA/g, '#D0DDFF')
  .replace(/#020814/g, '#0047FF');

const filesHoverIcon = inputFilesIcon
  .replace(/#F3F5FA/g, '#D0DDFF')
  .replace(/#020814/g, '#0047FF');

const photoHoverIcon = inputPhotoIcon
  .replace(/#F3F5FA/g, '#D0DDFF')
  .replace(/#020814/g, '#0047FF');

const multiChoiceMenuCancelHoverIcon = MultiChoiceMenuCancelIcon
  .replace(/#020814/g, '#0047FF')
  .replace(/<svg([^>]*)>/, '<svg$1><rect width="24" height="24" rx="4" fill="#E3E7EF"/>');

export const FILE_TYPE_AUDIO_ICON = URL.createObjectURL(new Blob([FileTypeAudioIcon], { type: 'image/svg+xml' }));
export const FILE_TYPE_EXCEL_ICON = URL.createObjectURL(new Blob([FileTypeExcelIcon], { type: 'image/svg+xml' }));
export const FILE_TYPE_IMAGE_ICON = URL.createObjectURL(new Blob([FileTypeImageIcon], { type: 'image/svg+xml' }));
export const FILE_TYPE_OTHER_ICON = URL.createObjectURL(new Blob([FileTypeOtherIcon], { type: 'image/svg+xml' }));
export const FILE_TYPE_PDF_ICON = URL.createObjectURL(new Blob([FileTypePdfIcon], { type: 'image/svg+xml' }));
export const FILE_TYPE_PPT_ICON = URL.createObjectURL(new Blob([FileTypePptIcon], { type: 'image/svg+xml' }));
export const FILE_TYPE_TXT_ICON = URL.createObjectURL(new Blob([FileTypeTxtIcon], { type: 'image/svg+xml' }));
export const FILE_TYPE_VIDEO_ICON = URL.createObjectURL(new Blob([FileTypeVideoIcon], { type: 'image/svg+xml' }));
export const FILE_TYPE_WORD_ICON = URL.createObjectURL(new Blob([FileTypeWordIcon], { type: 'image/svg+xml' }));

const FILE_TYPE_ICON_MAP: Record<string, string> = {
  jpg: FILE_TYPE_IMAGE_ICON,
  jpeg: FILE_TYPE_IMAGE_ICON,
  png: FILE_TYPE_IMAGE_ICON,
  gif: FILE_TYPE_IMAGE_ICON,
  bmp: FILE_TYPE_IMAGE_ICON,
  webp: FILE_TYPE_IMAGE_ICON,
  svg: FILE_TYPE_IMAGE_ICON,
  tif: FILE_TYPE_IMAGE_ICON,
  tiff: FILE_TYPE_IMAGE_ICON,
  ico: FILE_TYPE_IMAGE_ICON,
  heic: FILE_TYPE_IMAGE_ICON,
  txt: FILE_TYPE_TXT_ICON,
  log: FILE_TYPE_TXT_ICON,
  md: FILE_TYPE_TXT_ICON,
  rtf: FILE_TYPE_TXT_ICON,
  doc: FILE_TYPE_WORD_ICON,
  docx: FILE_TYPE_WORD_ICON,
  xls: FILE_TYPE_EXCEL_ICON,
  xlsx: FILE_TYPE_EXCEL_ICON,
  csv: FILE_TYPE_EXCEL_ICON,
  ppt: FILE_TYPE_PPT_ICON,
  pptx: FILE_TYPE_PPT_ICON,
  pdf: FILE_TYPE_PDF_ICON,
  mp3: FILE_TYPE_AUDIO_ICON,
  wav: FILE_TYPE_AUDIO_ICON,
  ogg: FILE_TYPE_AUDIO_ICON,
  aac: FILE_TYPE_AUDIO_ICON,
  flac: FILE_TYPE_AUDIO_ICON,
  m4a: FILE_TYPE_AUDIO_ICON,
  wma: FILE_TYPE_AUDIO_ICON,
  amr: FILE_TYPE_AUDIO_ICON,
  mp4: FILE_TYPE_VIDEO_ICON,
  mov: FILE_TYPE_VIDEO_ICON,
  avi: FILE_TYPE_VIDEO_ICON,
  mkv: FILE_TYPE_VIDEO_ICON,
  webm: FILE_TYPE_VIDEO_ICON,
  wmv: FILE_TYPE_VIDEO_ICON,
  flv: FILE_TYPE_VIDEO_ICON,
  m4v: FILE_TYPE_VIDEO_ICON,
  '3gp': FILE_TYPE_VIDEO_ICON,
};

/**
 * Return the file type icon for a filename extension.
 * @param fileName - File name
 * @returns Blob URL for the file type icon
 */
export const getFileTypeIconByName = (fileName: string): string => {
  if (!fileName) return FILE_TYPE_OTHER_ICON;
  const idx = fileName.lastIndexOf('.');
  if (idx < 0 || idx === fileName.length - 1) return FILE_TYPE_OTHER_ICON;
  const ext = fileName.slice(idx + 1).toLowerCase();
  return FILE_TYPE_ICON_MAP[ext] || FILE_TYPE_OTHER_ICON;
};

export const INPUT_ICON_EMOJI_HOVER_ICON = URL.createObjectURL(new Blob([emojiHoverIcon], { type: 'image/svg+xml' }));
export const INPUT_ICON_IMAGES_HOVER_ICON = URL.createObjectURL(new Blob([imagesHoverIcon], { type: 'image/svg+xml' }));
export const INPUT_ICON_FILES_HOVER_ICON = URL.createObjectURL(new Blob([filesHoverIcon], { type: 'image/svg+xml' }));
export const INPUT_ICON_PHOTO_HOVER_ICON = URL.createObjectURL(new Blob([photoHoverIcon], { type: 'image/svg+xml' }));

export const HOVER_MENU_ICON = URL.createObjectURL(new Blob([HoverMenuIcon], { type: 'image/svg+xml' }));
export const HOVER_MENU_ACTIVE_ICON = URL.createObjectURL(new Blob([HoverMenuActiveIcon], { type: 'image/svg+xml' }));
export const MODAL_CLOSE_ICON = URL.createObjectURL(new Blob([modalClose], { type: 'image/svg+xml' }));
export const MODAL_DOWNLOAD_ICON = URL.createObjectURL(new Blob([modalDownload], { type: 'image/svg+xml' }));

const modalUpHover = modalUp
  .replace(/#F3F5FA/g, '#D0DDFF')
  .replace(/#41464F/g, '#0047FF');

const modalDownHover = modalDown
  .replace(/#F3F5FA/g, '#D0DDFF')
  .replace(/#41464F/g, '#0047FF');

const modalDownloadHover = modalDownload
  .replace(/#F3F5FA/g, '#D0DDFF')
  .replace(/#41464F/g, '#0047FF');

const modalCloseHover = modalClose
  .replace(/#F3F5FA/g, '#D0DDFF')
  .replace(/#41464F/g, '#0047FF');



export const MODAL_UP_ICON = URL.createObjectURL(new Blob([modalUp], { type: 'image/svg+xml' }));
export const MODAL_UP_HOVER_ICON = URL.createObjectURL(new Blob([modalUpHover], { type: 'image/svg+xml' }));
export const MODAL_DOWN_ICON = URL.createObjectURL(new Blob([modalDown], { type: 'image/svg+xml' }));
export const MODAL_DOWN_HOVER_ICON = URL.createObjectURL(new Blob([modalDownHover], { type: 'image/svg+xml' }));
export const MODAL_DOWNLOAD_HOVER_ICON = URL.createObjectURL(new Blob([modalDownloadHover], { type: 'image/svg+xml' }));
export const MODAL_CLOSE_HOVER_ICON = URL.createObjectURL(new Blob([modalCloseHover], { type: 'image/svg+xml' }));

export const TAKE_PHOTO_SEND_ICON = URL.createObjectURL(new Blob([takePhotoSendIcon], { type: 'image/svg+xml' }));
export const MSG_MENU_DEELTE_ICON = URL.createObjectURL(new Blob([MsgMenuDeleteIcon], { type: 'image/svg+xml' }));
export const MSG_MENU_COPY_ICON = URL.createObjectURL(new Blob([MsgMenuCopyIcon], { type: 'image/svg+xml' }));
export const MSG_MENU_REPLY_ICON = URL.createObjectURL(new Blob([MsgMenuReplyIcon], { type: 'image/svg+xml' }));
export const MSG_MENU_SELECT_ICON = URL.createObjectURL(new Blob([MsgMenuSelectIcon], { type: 'image/svg+xml' }));
export const MSG_MENU_FORWARD_ICON = URL.createObjectURL(new Blob([MsgMenuForwardIcon], { type: 'image/svg+xml' }));
export const MSG_MENU_MERGE_FORWARD_ICON = URL.createObjectURL(new Blob([MsgMenuMergeForwardIcon], { type: 'image/svg+xml' }));

// Multi-choice menu hover icons
const msgMenuForwardHoverIcon = MsgMenuForwardIcon.replace(/#41464F/g, '#0047FF');
const msgMenuMergeForwardHoverIcon = MsgMenuMergeForwardIcon.replace(/#41464F/g, '#0047FF');
const msgMenuDeleteHoverIcon = MsgMenuDeleteIcon.replace(/#41464F/g, '#E35858');
const multiChoiceMenuCancelHoverIconForButton = MultiChoiceMenuCancelIcon.replace(/#020814/g, '#0047FF');

export const MSG_MENU_FORWARD_HOVER_ICON = URL.createObjectURL(new Blob([msgMenuForwardHoverIcon], { type: 'image/svg+xml' }));
export const MSG_MENU_MERGE_FORWARD_HOVER_ICON = URL.createObjectURL(new Blob([msgMenuMergeForwardHoverIcon], { type: 'image/svg+xml' }));
export const MSG_MENU_DELETE_HOVER_ICON = URL.createObjectURL(new Blob([msgMenuDeleteHoverIcon], { type: 'image/svg+xml' }));
export const MULTI_CHOICE_MENU_CANCEL_BUTTON_HOVER_ICON = URL.createObjectURL(new Blob([multiChoiceMenuCancelHoverIconForButton], { type: 'image/svg+xml' }));
export const MSG_MENU_STT_ICON = URL.createObjectURL(new Blob([MsgMenuSTTIcon], { type: 'image/svg+xml' }));
export const MSG_MENU_CANCEL_STT_ICON = URL.createObjectURL(new Blob([MsgMenuCancelSTTIcon], { type: 'image/svg+xml' }));
export const MSG_MENU_RECALL_ICON = URL.createObjectURL(new Blob([MsgMenuRecallIcon], { type: 'image/svg+xml' }));

export const CHANNELS_MENU_PIN_ICON = URL.createObjectURL(new Blob([convMenuTopIcon], { type: 'image/svg+xml' }));
export const CHANNELS_MENU_UNPIN_ICON = URL.createObjectURL(new Blob([convMenuUnTopIcon], { type: 'image/svg+xml' }));
export const CHANNELS_MENU_UNMUTE_ICON = URL.createObjectURL(new Blob([convMenuUnmuteIcon], { type: 'image/svg+xml' }));
export const CHANNELS_MENU_MUTE_ICON = URL.createObjectURL(new Blob([convMenuMuteIcon], { type: 'image/svg+xml' }));
export const CHANNELS_MENU_DELETE_ICON = URL.createObjectURL(new Blob([convMenuDeleteIcon], { type: 'image/svg+xml' }));

export const INPUT_ICON_PHOTO_ICON = URL.createObjectURL(new Blob([inputPhotoIcon], { type: 'image/svg+xml' }));
export const INPUT_ICON_IMAGES_ICON = URL.createObjectURL(new Blob([inputImageIcon], { type: 'image/svg+xml' }));
export const INPUT_ICON_EMOJI_ICON = URL.createObjectURL(new Blob([inputEmojiIcon], { type: 'image/svg+xml' }));
export const INPUT_ICON_FILES_ICON = URL.createObjectURL(new Blob([inputFilesIcon], { type: 'image/svg+xml' }));
export const INPUT_ICON_SEND_ICON = URL.createObjectURL(new Blob([inputSendIcon], { type: 'image/svg+xml' }));
export const INPUT_ICON_SEND_ACTIVE_ICON = URL.createObjectURL(new Blob([inputSendActiveIcon], { type: 'image/svg+xml' }));
export const INPUT_ICON_PLUS = URL.createObjectURL(new Blob([inputPlusIcon], { type: 'image/svg+xml' }));
export const EMOJI_PANEL_EMOJI_BTN_ICON = URL.createObjectURL(new Blob([EmojiPanelEmojiBtnIcon], { type: 'image/svg+xml' }));

export const DEFAULT_GROUP_PORTRAIT_SVG = URL.createObjectURL(new Blob([groupProfile], { type: 'image/svg+xml' }));
export const DEFAULT_USER_PORTRAIT_SVG = URL.createObjectURL(new Blob([userProfile], { type: 'image/svg+xml' }));
export const DEFAULT_SYSTEM_PORTRAIT_SVG = URL.createObjectURL(new Blob([systemProfile], { type: 'image/svg+xml' }));

export const NOTIFICATION_SVG = URL.createObjectURL(new Blob([notification], { type: 'image/svg+xml' }));
export const TOP_ICON = URL.createObjectURL(new Blob([topIcon], { type: 'image/svg+xml' }));
export const CHECKED_ICON = URL.createObjectURL(new Blob([checked], { type: 'image/svg+xml' }));
export const SEARCH_ICON = URL.createObjectURL(new Blob([search], { type: 'image/svg+xml' }));
export const TRIANGLE_ICON = URL.createObjectURL(new Blob([triangle], { type: 'image/svg+xml' }));

export const CHANNELS_EMPTY_ICON = URL.createObjectURL(new Blob([ChannelsEmptyIcon], { type: 'image/svg+xml' }));
export const GROUP_MEMBERS_ICON = URL.createObjectURL(new Blob([GroupMembersIcon], { type: 'image/svg+xml' }));

export const TAKE_PHOTO_CANCEL_ICON = URL.createObjectURL(new Blob([TakePhotoCancelIcon], { type: 'image/svg+xml' }));
export const TAKE_PHOTO_RETRY_ICON = URL.createObjectURL(new Blob([TakePhotoRetryIcon], { type: 'image/svg+xml' }));
export const TAKE_PHOTO_CAMERA_ICON = URL.createObjectURL(new Blob([TakePhotoCameraIcon], { type: 'image/svg+xml' }));

export const MULTI_CHOICE_MENU_CANCEL_ICON = URL.createObjectURL(new Blob([MultiChoiceMenuCancelIcon], { type: 'image/svg+xml' }));
export const MULTI_CHOICE_MENU_CANCEL_HOVER_ICON = URL.createObjectURL(new Blob([multiChoiceMenuCancelHoverIcon], { type: 'image/svg+xml' }));

export const AUDIO_ICON = URL.createObjectURL(new Blob([AudioIcon], { type: 'image/svg+xml' }));
export const AUDIO_SELF_ICON = URL.createObjectURL(new Blob([AudioSelfIcon], { type: 'image/svg+xml' }));
export const AUDIO_STOP_ICON = URL.createObjectURL(new Blob([AudioStopIcon], { type: 'image/svg+xml' }));
export const AUDIO_RUN_ICON = URL.createObjectURL(new Blob([AudioRunIcon], { type: 'image/svg+xml' }));
export const IMAGE_FAILED = URL.createObjectURL(new Blob([ImageFailed], { type: 'image/svg+xml' }));
export const PLAY_ICON = URL.createObjectURL(new Blob([PlayIcon], { type: 'image/svg+xml' }));

export const SENT_STATUS_FAILED_ICON = URL.createObjectURL(new Blob([SentStatusFailedIcon], { type: 'image/svg+xml' }));
export const SENT_STATUS_READ_ICON = URL.createObjectURL(new Blob([SentStatusReadIcon], { type: 'image/svg+xml' }));
export const SENT_STATUS_UNREAD_ICON = URL.createObjectURL(new Blob([SentStatusUnreadIcon], { type: 'image/svg+xml' }));
export const SENT_STATUS_SENDING_ICON = URL.createObjectURL(new Blob([SentStatusSendingIcon], { type: 'image/svg+xml' }));
export const SENT_STATUS_UNREAD_CHAT_ICON = URL.createObjectURL(new Blob([SentStatusUnreadChatIcon], { type: 'image/svg+xml' }));
export const SENT_STATUS_SENDING_CHAT_ICON = URL.createObjectURL(new Blob([SentStatusSendingChatIcon], { type: 'image/svg+xml' }));
