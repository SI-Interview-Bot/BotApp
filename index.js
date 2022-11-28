const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const restify = require('restify');

const NAME = 'InterviewBot';

const pino = require('pino');
var LOGOPTS = { name: NAME, level: process.env.LOGLEVEL || 'debug' };
var LOG = pino(LOGOPTS);
//var PRETTYFILE = pino.transport({ target: 'pino-pretty', options: { destination: 'logfiles/bot.log' } });
//var LOG = pino(LOGOPTS, PRETTYFILE);
//LOG = require('pino-caller')(LOG, { relativeTo: __dirname });
//LOG.originalTrace = LOG.trace;
//LOG.trace = function(...args) { if (args.length === 0) { return this.isLevelEnabled('trace'); } else { return this.originalTrace.apply(this, arguments); } };

// Import required bot services.
const { CloudAdapter, MemoryStorage,
    ConfigurationBotFrameworkAuthentication } = require('botbuilder');

const { EventStore } = require('./eventStore');
const { InterviewBot } = require('./interviewBot');

const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(process.env);
const adapter = new CloudAdapter(botFrameworkAuthentication);

adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights. See https://aka.ms/bottelemetry for telemetry
    //       configuration instructions.
    LOG.error(`[onTurnError] unhandled error: ${ error }`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

// Create storage and Event Store used for tracking sent messages.
const memoryStorage = new MemoryStorage();
const eventStore = new EventStore(memoryStorage, LOG, process.env.EVENTSTORE || './events.json');

// Create the bot that will handle incoming messages.
const bot = new InterviewBot(eventStore, LOG, adapter, process.env.MicrosoftAppId);

// Create HTTP server.
const server = restify.createServer({
    name: NAME, version: '1.0.0', log: LOG });
server.pre(restify.pre.sanitizePath());
server.pre(restify.pre.userAgentConnection());
server.use(restify.plugins.requestLogger());
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());
server.listen(process.env.port || process.env.PORT || 3978, function() {
    LOG.info(`${ server.name } listening to ${ server.url }`);
});

// Listen for incoming requests.
server.get('/api', async (req, res, next) => {
    LOG.debug('GET /api');
    res.json({ 'events': Object.keys(await eventStore.events()).length });
    return next();
});

server.post('/api/events', async (req, res, next) => {
    LOG.debug(`POST /api/events: ${ JSON.stringify(req.body) }`);
    res.json(await bot.postEvent(req.body));
    return next();
});

server.get('/api/events', async (req, res, next) => {
    LOG.debug('GET /api/events');
    res.json(await bot.getEvents(null));
    return next();
});

server.get('/api/events/:key', async (req, res, next) => {
    LOG.debug(`GET /api/events/${ req.params.key }`);
    res.json(await bot.getEvents(req.params.key));
    return next();
});

server.put('/api/events/:key', async (req, res, next) => {
    LOG.debug(`PUT /api/events/${ req.params.key }: ${ JSON.stringify(req.body) }`);
    res.json(await bot.postEvent(req.body, req.params.key));
    return next();
});

server.del('/api/events/:key', async (req, res, next) => {
    LOG.debug(`DELETE /api/events/${ req.params.key }`);
    res.json(await bot.deleteEvent(req.params.key));
    return next();
});

server.post('/api/messages', async (req, res) => {
    // Route received a request to adapter for processing
    await adapter.process(req, res, (context) => bot.run(context));
});

server.post('/api/echo', async (req, res, next) => {
    res.json(JSON.stringify(req, (k, v) => (["parser", "socket", "client", "streams"].includes(k) ? "NIX" : v), 2));
    return next();
});

server.get('/', async (req, res, next) => {
    res.json([
        'GET     /',
        'GET     /api',
        'POST    /api/events',
        'GET     /api/events',
        'GET     /api/events/:key',
        'PUT     /api/events/:key',
        'DELETE  /api/events/:key',
        'POST    /api/messages',
        'POST    /api/echo'
    ]);
    return next();
});
