/**
 * Language pack entries for the chat UI
 * @description Built-in language pack entries for the chat UI
 */
export interface LanguagePackEntries {
  'channel.loading.msg': string,
  'channel.mentioned.me.msg': string,
  'channel.mentioned.all.msg': string,
  'channel.draft.msg': string,

  'message.list.select': string,
  'message.list.unselect': string,
  'message.list.deleted.by.self': string,
  'message.list.deleted.by.other': string,
  'message.list.back': string,
  'message.list.read-receipt.tooltip.all-unread': string,
  'message.list.read-receipt.tooltip.all-read': string,
  'message.list.read-receipt.tooltip.read-count': string,
  'message.list.read-receipt.tooltip.unread-count': string,
  // Message types
  'message-type.RC:ImgMsg': string,
  'message-type.RC:HQVCMsg': string,
  'message-type.RC:VcMsg': string,
  'message-type.RC:GIFMsg': string,
  'message-type.RC:FileMsg': string,
  'message-type.RC:SightMsg': string,
  'message-type.RC:ImgTextMsg': string,
  'message-type.RC:LBSMsg': string,
  'message-type.RC:CombineV2Msg': string,
  'message-type.RC:ReferenceMsg': string,
  'message-type.unknown': string,

  // Time formats
  'time.format.today': string,
  'time.format.yesterday': string,
  'time.format.monday': string,
  'time.format.tueday': string,
  'time.format.wedday': string,
  'time.format.thurday': string,
  'time.format.friday': string,
  'time.format.satday': string,
  'time.format.sunday': string,
  'time.format.full': string,

  // Input component
  'input.menu.item.photo': string,
  'input.menu.item.images': string,
  'input.menu.item.files': string,
  'input.menu.item.emoji': string,
  'input.placeholder': string,
  'input.send': string,
  'input.reply.prefix': string,
  'input.mentioned.all': string,
  'input.placeholder.search': string,

  // Channel menu
  'channel.menu.item.pin': string,
  'channel.menu.item.unpin': string,
  'channel.menu.item.mute': string,
  'channel.menu.item.unmute': string,
  'channel.menu.item.remove': string,

  // Message menu
  'message.menu.item.reply': string,
  'message.menu.item.multi.choice': string,
  'message.menu.item.copy': string,
  'message.menu.item.forward': string,
  'message.menu.item.delete.for.me': string,
  'message.menu.item.delete.for.all': string,
  'message.menu.item.speech.to.text': string,
  'message.menu.item.cancel.speech.to.text': string,
  'message.speech.to.text.failed': string,
  'message.speech.to.text.empty': string,
  'message.speech.to.text.unsupported': string,

  'channel.empty.desc': string,
  'channel.list.empty.desc': string,
  'channel.list.bar.title': string,
  'channel.detail.bar.typing': string,
  'channel.detail.bar.typing.audio': string,

  // Alerts
  'alert.req.msg.error': string,
  'alert.pickfiles.maxcount': string,
  'alert.paste.not.supported': string,
  'alert.delete.message.failed': string,
  'alert.delete.messages.partial.failure': string,
  'alert.delete.channel.failed': string,
  /** IMLib and other network-related failures, such as error code 30002. */
  'alert.imlib.failed.network': string,
  /** Generic IMLib failure message. */
  'alert.imlib.failed.generic': string,
  'alert.forward.not.supported': string,
  'alert.forward.over.length': string,
  'alert.send.message.maxcount': string,
  'alert.message-deleted': string,
  'alert.channel.list.not.ready': string,

  'dialog.tips.msg': string,
  'dialog.cancel.msg': string,
  'dialog.confirm.msg': string,
  'dialog.forwarding.msg': string,
  'dialog.forwarding.confirm': string,

  'take-photo.send-btn.label': string,
  'take-photo.cancel-btn.label': string,
  'take-photo.retry-btn.label': string,
  'take-photo.msg.camera-starting': string,
  'take-photo.msg.camera-startup-failure': string,

  'multi-choice.menu.selected-count': string,
  'multi-choice.menu.merge-forward': string,
  'multi-choice.menu.forward-item-by-item': string,

  'private.combine-msg.title': string,
  'group.combine-msg.title': string,
  'private.combine-msg.signal.title': string,
  'combine-msg.chat-record': string,

  'connection.status.disconnected': string,
  'connection.status.connecting': string,

  // Toasts
  'toast.forward.success': string,
  'toast.copy.success': string,
}
