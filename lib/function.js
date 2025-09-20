const { call, client } = require('./database');
const { URL } = require('url');
const { ObjectId } = require('mongodb');

class App {
    // Timestamp Microservice
    static timestamp(d) {
        let date;
        
        if (!d) {
            date = new Date();
        } else {
            if (!isNaN(d)) {
                date = new Date(parseInt(d));
            } else {
                date = new Date(d);
            }
        }

        if (date.toString() === "Invalid Date") {
            return { error: true }
        }

        return { unix: date.getTime(), utc: date.toUTCString() };
    }

    // Request Header Parser Microservice
    static headerParser(r) {
        const ip = r.clientIp || r.ip || '';
        const lang = r.get('accept-language') || '';
        const ua = r.get('user-agent') || '';

        return { ip, lang, ua };
    }

    // URL Shortener Microservice
    static #isURLValid(u) {
        try {
            if (!u.startsWith('http://') && !u.startsWith('https://')) {
                return false;
            }

            new URL(u);
            return true;
        } catch(err) {
            console.error(error.message);
            return false;
        }
    }

    static #isNumberValid(n) {
        return /^\d+$/.test(n);
    }

    static async insertURL(u) {
        if (!this.#isURLValid(u)) {
            return { code: 0 };
        }

        const db = call();
        const session = client.startSession();

        try {
            let response;
            await session.withTransaction(async () => {
                const urlExist = await db.collection('urls')
                    .findOne({ domain: u }, { projection: { short_url: 1 }, session });
                if (urlExist?.short_url != null) {
                    response = { code: urlExist?.short_url };
                    return;
                }

                const sequence = await db.collection('counters')
                    .findOneAndUpdate(
                        { _id: 'domain' },
                        { $inc: { seq_value: 1 } },
                        { upsert: true, returnDocument: "after" }
                    );
                const c = sequence.value?.seq_value ?? sequence?.seq_value;

                await db.collection('urls')
                    .insertOne({
                        domain: u,
                        short_url: c,
                        created: new Date()
                    }, { session });

                response = { code: c };
            });

            return response ?? { code: null };
        } catch(err) {
            console.error(err.message);

            if (err?.code === 11000) {
                const urlDupl = await db.collection('urls')
                    .findOne({ domain: u }, { project: { short_url: 1 } });

                if (urlDupl?.short_url != null) {
                    return { code: urlDupl?.short_url };
                }
            }

            return { code: 0 };
        } finally {
            await session.endSession();
        }
    }

    static async findURL(c) {
        c = parseInt(c);
        if (!this.#isNumberValid(c)) {
            return { domain: null };
        }

        const db = call();
        const findCode = await db.collection('urls')
            .findOne({ short_url: c });

        return { domain: findCode?.domain ?? null };
    }

    // Exercise Tracker
    static #isUsernameValid(u) {
        // (Patch) i forgot, they use "_".
        return /^[A-Za-z0-9_]+$/.test(u);
    }

    static async createUser(u) {
        const db = call();
        if (!u) {
            return { error: 'Username is required.' }
        } else if (!this.#isUsernameValid(u)) {
            return { error: 'Invalid Username.' }
        }

        try {
            const { insertedId } = await db.collection('users')
                .insertOne({ username: u });

            return { id: insertedId };
        } catch(err) {
            console.error(err.message);

            if (err.code === 11000) {
                const userExist = await db.collection('users')
                    .findOne({ username: u }, { projection: { username: 1 } });

                return { id: userExist._id };
            }

            return { error: err.message };
        }
    }

    static async retrieveUsers() {
        const db = call();

        try {
            const users = await db.collection('users')
                .find({}, { projection: { username: 1 } })
                .toArray();

            return users;
        } catch(err) {
            console.error(err.message);
            return { error: err.message }
        }
    }

    static async addExercise(i, b) {
        const db = call();
        if (!i) {
            return { error: 'ID is required.' };
        } else if (!ObjectId.isValid(i)) {
            return { error: 'Invalid ID.' };
        }

        let { description, duration, date } = b;
        description = description ? String(description) : 'this is a description inputted by @mkgp-dev';
        duration = duration ? parseInt(duration) : 0;
        if (duration <= 0) {
            return { error: 'Duration should not be less than or equal to 0.' };
        }

        date = date ? new Date(date) : new Date();
        if (isNaN(date.getTime())) {
            return { error: 'Invalid Date.' };
        }

        try {
            const user = await db.collection('users')
                .findOne({ _id: new ObjectId(i) });
            if (!user) {
                return { error: 'User not found.' }
            }

            await db.collection('exercises')
                .insertOne({
                    userId: user._id,
                    description,
                    duration,
                    date
                });
            
            return { username: user.username, description, duration, date };
        } catch(err) {
            console.error(err.message);
            return { error: err.message }
        }
    }

    static async retrieveLogs(i, q) {
        const db = call();
        if (!i) {
            return { error: 'ID is required.' };
        } else if (!ObjectId.isValid(i)) {
            return { error: 'Invalid ID.' };
        }

        const { from, to, limit } = q;
        const filter = {};

        if (from) {
            const d = new Date(from);
            if (!isNaN(d)) {
                filter.$gte = new Date(d.setHours(0, 0, 0, 0));
            }
        }

        if (to) {
            const d = new Date(to);
            if (!isNaN(d)) {
                // (Patch) typo lmao.
                filter.$lte = new Date(d.setHours(23, 59, 59, 999));
            }
        }

        const lim = limit ? Math.max(0, parseInt(limit, 10)) : 0;

        try {
            const user = await db.collection('users')
                .findOne({ _id: new ObjectId(i) });
            if (!user) {
                return { error: 'User not found.' };
            }

            const uid = { userId: user._id };
            if (Object.keys(filter).length) {
                uid.date = filter;
            }

            const base = await db.collection('exercises')
                .find(uid, { projection: { description: 1, duration: 1, date: 1 } })
                .sort({ date: 1, _id: 1 })
            
            const b = lim ? await base.limit(lim).toArray() : await base.toArray();

            const log = b.map((r) => ({
                description: r.description,
                duration: r.duration,
                date: new Date(r.date).toDateString()
            }));

            return {
                id: user._id,
                username: user.username,
                count: b.length,
                log
            }
        } catch(err) {
            console.error(err.message);
            return { error: err.message }
        }
    }

    // File Metadata Microservice
    static fileAnalyze(r) {
        if (!r.file) {
            return { error: 'No file uploaded.' };
        }

        try {
            const { originalname: name, mimetype: type, size } = r.file;
            return { name, type, size };
        } catch(err) {
            console.error(err.message);
            return { error: err.message }
        }
    }
}


module.exports = App;
