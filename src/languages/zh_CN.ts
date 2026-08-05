import { LanguagePackEntries } from './LanguagePackEntries';

const entries: LanguagePackEntries = {
  'channel.loading.msg': '加载中...',
  'channel.mentioned.me.msg': '@我',
  'channel.mentioned.all.msg': '@所有人',
  'channel.draft.msg': '[草稿]',

  'message.list.select': '选择以下信息',
  'message.list.unselect': '取消选择',
  'message.list.deleted.by.self': '你撤回了一条消息',
  'message.list.deleted.by.other': '{0} 撤回了一条消息',
  'message.list.back': '返回',
  'message.list.read-receipt.tooltip.all-unread': '全部未读',
  'message.list.read-receipt.tooltip.all-read': '全部已读',
  'message.list.read-receipt.tooltip.read-count': '{0} 人已读',
  'message.list.read-receipt.tooltip.unread-count': '{0} 人未读',

  // 消息类型
  'message-type.RC:ImgMsg': '[图片]',
  'message-type.RC:HQVCMsg': '[语音]',
  'message-type.RC:VcMsg': '[语音]',
  'message-type.RC:GIFMsg': '[图片]',
  'message-type.RC:FileMsg': '[文件]',
  'message-type.RC:SightMsg': '[视频]',
  'message-type.RC:ImgTextMsg': '[图文]',
  'message-type.RC:LBSMsg': '[位置]',
  'message-type.RC:CombineV2Msg': '[合并转发]',
  'message-type.RC:ReferenceMsg': '[引用]',
  'message-type.unknown': '[不支持的消息类型]',


  // 时间格式
  'time.format.today': '今天',
  'time.format.yesterday': '昨天',
  'time.format.monday': '星期一',
  'time.format.tueday': '星期二',
  'time.format.wedday': '星期三',
  'time.format.thurday': '星期四',
  'time.format.friday': '星期五',
  'time.format.satday': '星期六',
  'time.format.sunday': '星期日',
  'time.format.full': '{0}/{1}/{2}',

  // 输入框菜单
  'input.menu.item.photo': '拍照',
  'input.menu.item.images': '图片',
  'input.menu.item.files': '文件',
  'input.menu.item.emoji': '表情',
  'input.placeholder': 'Shift + Enter 换行, Enter 发送',
  'input.send': '发送',
  'input.reply.prefix': '回复 ',
  'input.mentioned.all': '所有人',
  'input.placeholder.search': '搜索',

  // 会话菜单
  'channel.menu.item.pin': '置顶',
  'channel.menu.item.unpin': '取消置顶',
  'channel.menu.item.mute': '免打扰',
  'channel.menu.item.unmute': '取消免打扰',
  'channel.menu.item.remove': '删除',

  'message.menu.item.reply': '回复',
  'message.menu.item.multi.choice': '多选',
  'message.menu.item.copy': '复制',
  'message.menu.item.forward': '转发',
  'message.menu.item.delete.for.me': '删除',
  'message.menu.item.delete.for.all': '撤回',
  'message.menu.item.speech.to.text': '转文字',
  'message.menu.item.cancel.speech.to.text': '取消转文字',
  'message.speech.to.text.failed': '语音转换失败',
  'message.speech.to.text.empty': ' ',
  'message.speech.to.text.unsupported': '此语音消息不支持转文字功能',

  'channel.empty.desc': '暂无消息',
  'channel.list.empty.desc': '暂无对话',
  'channel.list.bar.title': '会话',
  'channel.detail.bar.typing': '对方正在输入...',
  'channel.detail.bar.typing.audio': '对方正在讲话...',

  // 警告信息
  'alert.req.msg.error': '请求消息失败: {0}',
  'alert.pickfiles.maxcount': '最多只能选择 {0} 个文件',
  'alert.paste.not.supported': '您的浏览器不支持粘贴操作',
  'alert.delete.message.failed': '删除消息失败: {0}',
  'alert.delete.messages.partial.failure': '删除 {0} 条消息失败',
  'alert.delete.channel.failed': '删除会话失败: {0}',
  'alert.imlib.failed.network': '当前请求未成功，请检查网络后稍候重试。（错误码：{0}）',
  'alert.imlib.failed.generic': '操作未成功，请稍后重试。（错误码：{0}）',
  'alert.forward.not.supported': '选中的第 {0} 条消息不支持转发',
  'alert.forward.over.length': '聊天记录选择不能超过 100 条',
  'alert.send.message.maxcount': '内容超过 {0} 字, 请删除部分内容后再尝试发送',
  'alert.message-deleted': '消息被删除',
  'alert.channel.list.not.ready': '会话列表仍在加载中, 请稍后再试',

  'dialog.tips.msg': '提示',
  'dialog.cancel.msg': '取消',
  'dialog.confirm.msg': '确认',
  'dialog.forwarding.msg': '转发给',
  'dialog.forwarding.confirm': '发送',

  'take-photo.send-btn.label': '发送',
  'take-photo.cancel-btn.label': '取消',
  'take-photo.retry-btn.label': '重拍',
  'take-photo.msg.camera-starting': '相机启动中...',
  'take-photo.msg.camera-startup-failure': '相机启动失败: {0}',

  'multi-choice.menu.selected-count': '已选择 {0} 项',
  'multi-choice.menu.merge-forward': '合并转发',
  'multi-choice.menu.forward-item-by-item': '逐条转发',

  'private.combine-msg.title': '{0} 和 {1} 的聊天记录',
  'private.combine-msg.signal.title': '{0} 的聊天记录',
  'group.combine-msg.title': '群聊的聊天记录',
  'combine-msg.chat-record': '聊天记录',

  'connection.status.disconnected': '已主动断开连接',
  'connection.status.connecting': '连接中...',

  // 提示框
  'toast.forward.success': '转发成功',
  'toast.copy.success': '已复制',
};

export default entries;
