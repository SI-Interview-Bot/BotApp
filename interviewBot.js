const { ActivityHandler, ActivityTypes, MessageFactory, TurnContext } = require('botbuilder');

class InterviewBot extends ActivityHandler {
    constructor(eventStore, log, adapter, defaultChannel) {
        super();
        this._store = eventStore;
        this._log = log;
        this._adapter = adapter;
        this._conversationRefs = {};
        this._defaultChannel = defaultChannel;
        this._defaultContext = new TurnContext(this._adapter, { type: ActivityTypes.Message, conversation: { id: this._defaultChannel } }); // FIXME

        // FIXME Why does this need to be caught at such a broad level,
        //     rather than by something like onReactionsAddedActivity?
        this.onEvent(async (context, next) => {
            this._log.debug(`Event: ${ JSON.stringify(context.activity) }`);
            const act = context.activity;
            const cd = act.channelData;
            if (cd && cd.item && (cd.type == 'reaction_removed' || cd.type == 'reaction_added')) {
                var reactions = [{ replyToId: cd.item.ts, channel: cd.item.channel, user: cd.user, type: cd.reaction }];
                await this.processReactions(reactions, context, cd.type == 'reaction_added');
            }
            await next();
        });
        /*this.onMessage(async (context, next) => {
            await this.sendMessageAndLogActivityId(context, `echo: ${ context.activity.text }`);
            await next();
        });*/

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
            if (!key || e.key === key) {
                events[e.key] = { ...e, message: this.eventMessage(e) };
            }
        }
        this._log.debug(`Got events: ${JSON.stringify(events)}`);
        return events;
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
        const sendIt = async (context, id, ref, channelData) => {
            var activity = text ? MessageFactory.text(text) : null;
            if (activity && channelData) {
                activity.channelData = channelData;
            }
            if (!send) {
                if (!id) {
                    this._log.warn(`No ID, can't ${ activity ? 'update' : 'delete' } message`);
                    return;
                }
                if (activity) {
                    activity.id = id;
                }
            }
            var res = !activity ? await context.deleteActivity(id)
                : send ? await context.sendActivity(activity)
                       : await context.updateActivity(activity);
            this._log.debug(`Res (${ !activity ? 'delete' : (send ? 'send' : 'update') }): ${ res ? JSON.stringify(res) : 'NIL' }`);
            if (send && (!res || !res.id)) {
                this._log.warn(`Error sending message: ${ res ? JSON.stringify(res) : 'NIL' }`);
            } else {
                this._log.debug(`Message ${ !activity ? 'deleted' : (send ? 'sent' : 'updated') }: ${ res ? res.id : 'NIL' }`);
                if (res && res.id) {
                    var newid = res.id;
                    idMap[newid] = ref || TurnContext.getConversationReference({ ...context.activity, ...activity });
                    const slack = await this._adapter.getAPI(activity);
                    if (!slack ||
                        !(res = await slack.pins.add({ channel: activity.channelData.channel, timestamp: res.id })) ||
                        !res.ok) {
                        this._log.warn(`Failed to pin message ${ newid }: ${ slack ? (res ? res.error : '') : 'API error' }`);
                    }
                }
            }
        };
        if (Object.keys(refMap).length == 0) {
            // FIXME This hack works, but may not always. How do
            //   we just send to a Slack channel when we have not
            //   received a message from one since we started?
            await sendIt(this._defaultContext, null, null, { channel: this._defaultChannel });
        } else {
            for (const id in refMap) {
                var ref = refMap[id];
                await this._adapter.continueConversation(ref, async (context) => {
                    await sendIt(context, id, ref); });
            }
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
        const message = MessageFactory.text(text);
        const response = await context.sendActivity(message);
        //await this._store.append(response.id, message);
    }

    // TODO Slack channel? (How to pin, etc.?)
    // TODO Persist conversation references between restarts?
    // TODO Event store persistence in Azure (Cosmo DB or Blobs?)
    // TODO Slack response buttons?
    async onConversationUpdateActivity(context) {
        const ref = TurnContext.getConversationReference(context.activity);
        this._log.debug(`Conversation update: ${ JSON.stringify(ref) }`);
        this._conversationRefs[ref.conversation.id] = ref;
    }

    async processReactions(reactions, context, added) {
        for (var i = 0, len = reactions.length; i < len; i++) {
            this._log.debug(`Reaction ${ i }: ${ JSON.stringify(reactions[i]) }`);
            // The replyToId of the inbound MessageReaction Activity
            // should correspond to a Message ID that was previously
            // sent from this bot.
            var eventObj = await this._store.find(reactions[i].replyToId);
            if (!eventObj) {
                // If we had sent the message from the error handler
                // we wouldn't have recorded the Activity Id and so
                // we shouldn't expect to see it in the log.
                this._log.warn(`Message ${ reactions[i].replyToId } not found.`);
            } else {
                // TODO Record the reaction
                this._log.info(`User ${ reactions[i].user } ${ added ? "added" : "removed" } '${ reactions[i].type }' regarding '${ eventObj.key }'`);
            }
        }
    }
}

module.exports.InterviewBot = InterviewBot;
