import { generateMessageIDV2, generateWAMessage, getUrlInfo, proto } from "@whiskeysockets/baileys";

export const DELIVERY_NAMES = ["error", "pending", "server_ack", "delivered", "read", "played"];

export function createDelivery({ store, session, logger, log = () => {}, generate = generateWAMessage }) {
  return {
    async getMessage(key) {
      if (!key?.id) return undefined;
      try {
        const record = await store.update(session, key.id, { retry: true });
        log(record ? "retry content available" : "retry content missing or expired", key.id);
        return record ? proto.Message.decode(record.content) : undefined;
      } catch {
        log("retry content could not be read", key.id);
        return undefined;
      }
    },

    async remember(message) {
      if (message.key?.fromMe && message.key.id && message.message) {
        await store.save(session, message.key.id, proto.Message.encode(message.message).finish());
      }
    },

    async update(key, update) {
      if (!key?.id || update.status === undefined) return;
      const record = await store.update(session, key.id, { status: update.status });
      if (record) log("message delivery", key.id, DELIVERY_NAMES[record.status]);
    },

    async status(id) {
      const record = await store.get(session, id);
      if (!record) return undefined;
      return {
        messageId: id,
        delivery: DELIVERY_NAMES[record.status],
        retryRequests: record.retryRequests,
        createdAt: new Date(record.createdAt).toISOString(),
        updatedAt: new Date(record.updatedAt).toISOString(),
      };
    },

    async send(socket, jid, content) {
      const message = await generate(jid, content, {
        userJid: socket.user.id,
        upload: socket.waUploadToServer,
        logger,
        messageId: generateMessageIDV2(socket.user.id),
        getProfilePicUrl: socket.profilePictureUrl,
        getUrlInfo: (url) => getUrlInfo(url, { thumbnailWidth: 192, fetchOpts: { timeout: 3000 }, logger }),
      });

      // Save the exact protobuf before WhatsApp can request a retry.
      await store.save(session, message.key.id, proto.Message.encode(message.message).finish());
      try {
        await socket.relayMessage(jid, message.message, { messageId: message.key.id });
      } catch (err) {
        await store.update(session, message.key.id, { status: 0 });
        throw err;
      }

      return {
        messageId: message.key.id,
        delivery: DELIVERY_NAMES[(await store.get(session, message.key.id))?.status ?? 1],
      };
    },
  };
}
