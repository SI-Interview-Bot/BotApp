const { ActivityHandler, MessageFactory, TurnContext } = require('botbuilder');

class InterviewBot extends ActivityHandler {
    constructor(eventStore, log, adapter, appId) {
        super();
        this._store = eventStore;
        this._log = log;
        this._adapter = adapter;
        this._appId = appId;
        this._conversationRefs = {};

        var en = 'en-US', ny = 'America/New_York', num = 'numeric';
        var dopts = { timeZone: ny, weekday: 'long', month: num, day: num };
        var topts = { timeZone: ny, hour: num, minute: '2-digit', timeZoneName: 'short' };
        var ts = (e, o) => new Date(e.dateTime).toLocaleTimeString(en, {...topts, ...o});
        var tzmap = (tz) => ({ 'CDT': 'CST6CDT', 'CST': 'CST6CDT', 'CT': 'CST6CDT',
            'EDT': 'EST5EDT', 'ET': 'EST5EDT',
            'GMT-6': 'MDT', 'GMT-7': 'MST', 'MDT': 'MST7MDT', 'MT': 'MST7MDT',
            'PDT': 'PST8PDT', 'PST': 'PST8PDT', 'PT': 'PST8PDT' }[tz] || tz);
        var tz = (e) => ({ timeZone: ('' + e.timezone).replace(/[PMCE][SD]?T/, tzmap) });
        var ampm = (d) => (d.replace(' AM', 'am').replace(' PM', 'pm'));
        var dstr = (e, o) => new Date(e.dateTime).toLocaleDateString(en, {...dopts, ...o});
        var tstr = (e, o) => ampm(ts(e, o)).replace(/GMT[-+][0-9]+/, tzmap);
        var ctz = (e) => (e.timezone ? ' [' + tstr(e, tz(e)) + ' for candidate]' : '');
        this._datetimeUtils = { dstr: dstr, tstr: tstr, ctz: ctz };
    }

    eventMessage(e) {
        var d = this._datetimeUtils;
        var ins = (e) => (e.instructions ? '\n\n' + e.instructions : '');
        return `${e.role} ${e.type} ${e.key} ${e.name} on ${d.dstr(e)} at ` +
               `${d.tstr(e)}${d.ctz(e)} (${e.location || 'Zoom'})${ins(e)}`;
    }

    async getEvents(key) {
        var events = {};
        for await (const e of this._store.iter()) {
            if (!key || e.key === key) { events[e.key] = this.eventMessage(e); }
        }
        this._log.debug(`Got events: ${JSON.stringify(events)}`);
        return events;
    }

    async continueConversation(ref, callback) {
        await this._adapter.continueConversationAsync(this._appId, ref, callback);
    }

    async sendToConversations(text, idMap) {
        var send = false;
        var refMap = idMap;
        if (!idMap) {
            if (!text) {
                return null;
            }
            refMap = this._conversationRefs;
            idMap = {};
            send = true;
        }
        for (const id in refMap) {
            var ref = refMap[id];
            await this.continueConversation(ref, async (context) => {
                var activity = text ? MessageFactory.text(text) : null;
                if (!send && activity) {
                    activity.id = id;
                }
                var res = !activity ? await context.deleteActivity(id)
                    : send ? await context.sendActivity(activity)
                           : await context.updateActivity(activity);
                if (activity && (!res || !res.id || (!send && res.id != id))) {
                    this._log.warn(`Error ${ !activity ? 'deleting' : (send ? 'sending' : 'updating') } message: ${ id } (${ res ? res.id : 'NIL' })`);
                } else if (send) {
                    idMap[res.id] = ref;
                }
            });
        }
        return idMap;
    }

    async postEvent(eventObj, key) {
        await this._store.append(key || eventObj.key, eventObj, async (e) => {
            if (e) { // TODO Send first, add object with messageIds?
                var idMap = await this.sendToConversations(this.eventMessage(e), e.messageIds);
                if (!e.messageIds && idMap) {
                    this._store.append(e.key, { messageIds: idMap });
                }
            }
        });
        return { status: `Created/updated event for "${key || eventObj.key}"` };
    }

    async deleteEvent(key) {
        await this._store.remove(key, async (e) => {
            if (e) { // TODO Send first?
                await this.sendToConversations(null, e.messageIds);
            }
        });
        return { status: `Deleted event for "${key}"` };
    }

    async sendMessageAndLogActivityId(context, text) {
        const replyActivity = MessageFactory.text(text);
        const resourceResponse = await context.sendActivity(replyActivity);
        await this._store.append(resourceResponse.id, replyActivity);
    }

    // TODO Add Slack channel
    // TODO Test message update/delete on Slack (no-op in Emulator)
    // TODO Persist conversation references between restarts?
    // TODO Event store persistence in Azure (Cosmo DB or Blobs?)
    // TODO Pin messages in Slack
    // TODO Slack reaction tracking
    // TODO Slack response buttons?
    async onConversationUpdateActivity(context) {
        const ref = TurnContext.getConversationReference(context.activity);
        this._log.debug(`Conversation update: ${ JSON.stringify(ref) }`);
        this._conversationRefs[ref.conversation.id] = ref;
    }

    async disabledonMessage(context, next) {
        await this.sendMessageAndLogActivityId(context, `echo: ${ context.activity.text }`);
        await next();
    }

    async processReactions(reactions, context, added) {
        for (var i = 0, len = reactions.length; i < len; i++) {
            // The ReplyToId property of the inbound MessageReaction Activity should
            // correspond to a Message Activity that was previously sent from this bot.
            var activity = await this._store.find(context.activity.replyToId);
            if (!activity) {
                // If we had sent the message from the error handler we wouldn't have
                // recorded the Activity Id and so we shouldn't expect to see it in the log.
                await this.sendMessageAndLogActivityId(context, `Activity ${ context.activity.replyToId } not found in the log.`);
            } else {
                await this.sendMessageAndLogActivityId(context, `You ${ added ? "added" : "removed" } '${ reactions[i].type }' regarding '${ activity.text }'`);
            }
        }
    }

    async onReactionsAddedActivity(reactionsAdded, context) {
        await this.processReactions(reactionsAdded, context, true);
    }

    async onReactionsRemovedActivity(reactionsRemoved, context) {
        await this.processReactions(reactionsRemoved, context, false);
    }
}

module.exports.InterviewBot = InterviewBot;
