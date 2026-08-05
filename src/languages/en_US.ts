import { LanguagePackEntries } from './LanguagePackEntries';

const entries: LanguagePackEntries = {
  'channel.loading.msg': 'Loading...',
  'channel.mentioned.me.msg': '@You', // Product design uses second person only in English.
  'channel.mentioned.all.msg': '@all',
  'channel.draft.msg': '[Draft]',

  'message.list.select': 'Select the following message',
  'message.list.unselect': 'Unselect',
  'message.list.deleted.by.self': 'You deleted one message',
  'message.list.deleted.by.other': '{0} deleted one message',
  'message.list.back': 'Back',
  'message.list.read-receipt.tooltip.all-unread': 'All unread',
  'message.list.read-receipt.tooltip.all-read': 'All read',
  'message.list.read-receipt.tooltip.read-count': ' Read: {0}',
  'message.list.read-receipt.tooltip.unread-count': ' Unread: {0}',


  // Message types
  'message-type.RC:ImgMsg': '[Image]',
  'message-type.RC:HQVCMsg': '[Audio]',
  'message-type.RC:VcMsg': '[Audio]',
  'message-type.RC:GIFMsg': '[Image]',
  'message-type.RC:FileMsg': '[File]',
  'message-type.RC:SightMsg': '[Video]',
  'message-type.RC:ImgTextMsg': '[Image text]',
  'message-type.RC:LBSMsg': '[Location]',
  'message-type.RC:CombineV2Msg': '[Combine]',
  'message-type.RC:ReferenceMsg': '[Reference]',
  'message-type.unknown': '[Unsupported message types]',

  // Time formats
  'time.format.today': 'Today',
  'time.format.yesterday': 'Yesterday',
  'time.format.monday': 'Mon',
  'time.format.tueday': 'Tue',
  'time.format.wedday': 'Wed',
  'time.format.thurday': 'Thur',
  'time.format.friday': 'Fri',
  'time.format.satday': 'Sat',
  'time.format.sunday': 'Sun',
  'time.format.full': '{0}/{1}/{2}',

  // Input menu
  'input.menu.item.photo': 'Photo',
  'input.menu.item.images': 'Image',
  'input.menu.item.files': 'File',
  'input.menu.item.emoji': 'Emoji',
  'input.placeholder': 'Shift + Enter for newline, Enter for send',
  'input.send': 'Send',
  'input.reply.prefix': 'Reply ',
  'input.mentioned.all': 'all',
  'input.placeholder.search': 'search',

  'channel.menu.item.pin': 'Pin',
  'channel.menu.item.unpin': 'Unpin',
  'channel.menu.item.mute': 'Mute',
  'channel.menu.item.unmute': 'Unmute',
  'channel.menu.item.remove': 'Delete',

  'message.menu.item.reply': 'Reply',
  'message.menu.item.multi.choice': 'Multi-select',
  'message.menu.item.copy': 'Copy',
  'message.menu.item.forward': 'Forward',
  'message.menu.item.delete.for.me': 'Delete for me',
  'message.menu.item.delete.for.all': 'Delete for everyone',
  'message.menu.item.speech.to.text': 'Transcribe',
  'message.menu.item.cancel.speech.to.text': 'Cancel Transcribe',
  'message.speech.to.text.failed': 'Transcription failed',
  'message.speech.to.text.empty': ' ',
  'message.speech.to.text.unsupported': 'This voice message does not support transcription',

  'channel.empty.desc': 'No message',
  'channel.list.empty.desc': 'No channel',
  'channel.list.bar.title': 'Channel',
  'channel.detail.bar.typing': 'Typing...',
  'channel.detail.bar.typing.audio': 'Speaking...',

  // Alerts
  'alert.req.msg.error': 'Request message failed: {0}',
  'alert.pickfiles.maxcount': 'You can only select up to {0} files',
  'alert.paste.not.supported': 'Paste is not supported in your browser',
  'alert.delete.message.failed': 'Delete message failed: {0}',
  'alert.delete.messages.partial.failure': 'Delete {0} messages failed',
  'alert.delete.channel.failed': 'Delete channel failed: {0}',
  'alert.imlib.failed.network': 'The request could not be completed. Please check your network and try again later. (Error code: {0})',
  'alert.imlib.failed.generic': 'The operation could not be completed. Please try again later. (Error code: {0})',
  'alert.forward.not.supported': 'The {0} selected messages cannot be forwarded',
  'alert.forward.over.length': 'Select up to 100 chat transcripts',
  'alert.send.message.maxcount': 'Exceeds {0} characters, please delete some and try again.',
  'alert.message-deleted': 'Message deleted',
  'alert.channel.list.not.ready': 'Channel list is not ready, please try again later',

  'dialog.tips.msg': 'Tips',
  'dialog.cancel.msg': 'Cancel',
  'dialog.confirm.msg': 'OK',
  'dialog.forwarding.msg': 'Forward it to',
  'dialog.forwarding.confirm': 'Send',

  'take-photo.send-btn.label': 'Send',
  'take-photo.cancel-btn.label': 'Cancel',
  'take-photo.retry-btn.label': 'Retry',
  'take-photo.msg.camera-starting': 'Camera starting...',
  'take-photo.msg.camera-startup-failure': 'Camera startup failure: {0}',

  'multi-choice.menu.selected-count': 'Selected {0} items',
  'multi-choice.menu.merge-forward': 'Merge Forward',
  'multi-choice.menu.forward-item-by-item': 'Forward',

  'private.combine-msg.title': '{0} and {1} chat history',
  'private.combine-msg.signal.title': '{0}\'s chat history',
  'group.combine-msg.title': 'Group chat history',
  'combine-msg.chat-record': 'Chat History',

  'connection.status.disconnected': 'Disconnected',
  'connection.status.connecting': 'Connecting...',

  // Toast
  'toast.forward.success': 'Forwarded successfully',
  'toast.copy.success': 'Copied',
};

export default entries;
