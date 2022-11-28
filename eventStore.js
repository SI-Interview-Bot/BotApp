class EventStore {
    constructor(storage, log, file) {
        this._storage = storage;
        this._log = log;
        this._fs = require('fs');
        this._file = file;
        if (this._file) {
            this.load(this._file, (err) => {
                if (!err) {
                    this._log.info(`Loaded events: ${ this._file }`);
                }
            });
        }
    }

    async load(file, callback) {
        var success = true;
        var items = {};
        await this._fs.readFile(file, 'utf8', async (err, js) => {
            if (err) {
                this._log.warn(`Failed to read events: ${ err }`);
                success = false;
            } else {
                try {
                    items = JSON.parse(js);
                } catch (e) {
                    err = e;
                    this._log.error(`Failed to parse events: ${ err }`);
                    success = false;
                }
                if (success) {
                    await this._storage.write(items);
                }
            }
            if (callback) {
                callback(err);
            }
        });
        return success;
    }

    async save(file) {
        var success = true;
        var items = await this._storage.read(["events"]);
        await this._fs.writeFile(file, JSON.stringify(items), (err) => {
            if (err) {
                this._log.error(`Failed to write events: ${ err }`);
                success = false;
            } else {
                this._log.info(`Saved events: ${ this._file }`);
            }
        });
        return success;
    }

    async events(eventId, eventObj, callback) {
        var doWrite = false, remove = false;
        var items = await this._storage.read(["events"]);
        if (!items || typeof(items["events"]) == 'undefined') {
            items["events"] = { events: {}, eTag: '*' };
            this._log.info("Created events store");
            doWrite = true;
        }
        if (eventId != undefined) {
            if (eventObj != undefined) {
                var e = items.events.events[eventId];
                items.events.events[eventId] = { ...e, ...eventObj };
                this._log.info(`${e != undefined ? "Updated" : "Created"} event ${eventId}: ${JSON.stringify(eventObj)}`);
                doWrite = true;
            } else if (items.events.events[eventId] != undefined) {
                remove = true;
                eventObj = items.events.events[eventId];
                delete items.events.events[eventId];
                this._log.info(`Deleted event ${eventId}`);
                doWrite = true;
            }
        }
        if (doWrite) {
            await this._storage.write(items);
            if (this._file) {
                this.save(this._file);
            }
            if (callback) {
                callback(remove ? eventObj : items.events.events[eventId]);
            }
        }
        return items.events.events;
    }

    async append(eventId, eventObj, callback) {
        if (eventId == null) {
            throw new TypeError('eventId is required for EventStore.append');
        }
        if (eventObj == null) {
            throw new TypeError('eventObj is required for EventStore.append');
        }

        await this.events(eventId, eventObj, callback);
    }

    async remove(eventId, callback) {
        if (eventId == null) {
            throw new TypeError('eventId is required for EventStore.append');
        }

        await this.events(eventId, null, callback);
    }

    async* iter() {
        var events = await this.events();
        if (events) {
            for (const id in events) {
                yield events[id];
            }
        }
    }

    async find(eventId) {
        if (eventId == null) {
            throw new TypeError('eventId is required for EventStore.find');
        }

        var events = await this.events();
        return (events && events[eventId]) ? events[eventId] : null;
    }
}
exports.EventStore = EventStore;
