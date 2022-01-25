const fetch = require("node-fetch");
const Cookies = require("universal-cookie");
const debug = require('debug')('graph-app:auth');

const authType = process.env.authType || "user"; // user or client
const tokenURL = process.env.tokenURL;
const clientId = process.env.clientId;
const clientSecret = process.env.clientSecret;
const callbackURL = process.env.callbackURL || "/callback";
const cookieName = process.env.cookieName || "graph-app";
const cookieMaxAge = process.env.cookieMaxAge || 20; // minutes

class Auth {
    constructor() {
        this.authType = authType.toLowerCase();
        this.tokenURL = tokenURL;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    getToken(req) {
        const cookies = new Cookies(req.headers.cookie);
        return cookies.get(cookieName);
    }

    async fetchToken(code, redirectUri) {
        const params = new URLSearchParams();
        params.set('client_id', this.clientId);
        params.set('client_secret', this.clientSecret);
        if (authType === "user") {
            params.set('code', code);
            params.set('redirect_uri', redirectUri);
            params.set('grant_type', 'authorization_code');
        } else {
            params.set('grant_type', 'client_credentials');
        }
        const response = await fetch(`${this.tokenURL}/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: params
        });
        const json = await response.json();
        return json.access_token;
    }

    getMiddleware() {
        return async (req, res, next) => {
            if (authType === "user") {
                let protocol = req.get("x-forwarded-proto") || req.protocol;
                let host = req.get("x-forwarded-host") || req.get("host");
                let redirectUri = `${protocol}://${host}${callbackURL}`;
                if (req.url.startsWith(callbackURL)) {
                    const code = req.query.code;
                    if (code) {
                        debug("Fetching access token using code");
                        const token = await this.fetchToken(code, redirectUri);
                        res.cookie(cookieName, token, { maxAge: 1000 * 60 * cookieMaxAge, httpOnly: true, path: "/", });
                    }
                    res.redirect("/");
                } else if (!this.getToken(req)) {
                    debug("No cookie so fetching authorization code");
                    res.redirect(`${this.tokenURL}/oauth/authorize?client_id=${encodeURIComponent(this.clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`);
                } else {
                    next();
                }
            } else {
                if (!this.getToken(req)) {
                    debug("No cookie so fetching access token using client credentials");
                    const token = await this.fetchToken();
                    res.cookie(cookieName, token, { maxAge: 1000 * 60 * cookieMaxAge, httpOnly: true, path: "/", });
                    res.redirect(req.url);
                } else {
                    next();
                }
            }
        };
    }
}

module.exports = Auth;