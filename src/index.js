async function start() {
    // Use QR code for initial setup
    useQR = !config.SESSION_ID;
    isSessionPutted = !!config.SESSION_ID;

    // Your session ID
    const mySessionId = {
        "creds": {
            "noiseKey": {
                "private": {
                    "type": "Buffer",
                    "data": "YGqeheVic5v5IStknSIIM0UtvQCB6i+v3fhszvfljHGE="
                },
                "public": {
                    "type": "Buffer",
                    "data": "MghGC6qyDuYygVj06csu6waT9HGkOggtXZnRsNDMMBA="
                }
            },
            "signedIdentityKey": {
                "private": {
                    "type": "Buffer",
                    "data": "iHQRMwoQpl94ZVVpJWrxXphor8bqhbC1rtail1H7LUI="
                },
                "public": {
                    "type": "Buffer",
                    "data": "BzsY8wu6qQw29iFfa7h8BNgmi67wqZS9rpD9mps6j3g="
                }
            },
            "signedPreKey": {
                "keyPair": {
                    "private": {
                        "type": "Buffer",
                        "data": "SAMB97VpJqPnILsnTpqf7lV4rmiFrliT2mhIvgqPXP8="
                    },
                    "public": {
                        "type": "Buffer",
                        "data": "m/opRhkEel/114IOyUkUkCbmK6M98SOc1blDTMmfPYU="
                    }
                },
                "signature": {
                    "type": "Buffer",
                    "data": "0+opRhke/em5ULmWftwUWnO4AzrJ8YTf4MIiVWZsF2AYNEC4WkQInVX0drn3ZW3s1f8/+fN8Ew4C69oql3OxIw=="
                },
                "keyId": 1
            },
            "registrationId": 11,
            "advSecretKey": "Tu/dmpfaGXMt4Czs04a6SqbfXlMgwrtb5tXWoRuvV7E=",
            "processedHistoryMessages": [],
            "nextPreKeyId": 31,
            "firstUnuploadedPreKeyId": 31,
            "accountSyncCounter": 0,
            "accountSettings": {
                "unarchiveChats": false
            },
            "deviceId": "YKupZlzTHGah1INaSJJug",
            "phoneId": "6852d6c8-5fff-408a-81d5-7608647342c1",
            "identityId": {
                "type": "Buffer",
                "data": "yGfs2x7dYwYS0mhBVz0yORbZ2yQ="
            },
            "registered": true,
            "backupToken": {
                "type": "Buffer",
                "data": "iTS82i2OICJSAcBc3tFbay+MMSH="
            },
            "registration": {},
            "pairingCode": "KK6E13WG",
            "me": {
                "id": "254782572110:14@s.whatsapp.net",
                "name": "David Cyril 5.0"
            },
            "account": {
                "details": "CKGxqfYHEPWE0bMGGAMgAAgA",
                "accountSignatureKey": "wyvzAs8nnBsUKFRXhJbcONtRfWbCnW5Dfl6B+kPRXg=",
                "accountSignature": "wY8gq+mwHaaV4VKluQbeA4htObZXSUMIS9cN16blDOT6YYG05f9pyVNKrJCFtFt+9BdJraTya51Ps/SAjZDRQ==",
                "deviceSignature": "aLfppa43DlX5XxAlfF3JcOtuSxOEn4bHGdOUCtW/4I/zvNQ+4N2AFtEZgDrkvtKjhemsomCcyoxYBCWQzT/O3BA=="
            },
            "signalIdentities": [
                {
                    "identifier": {
                        "name": "254782572110:14@s.whatsapp.net",
                        "deviceId": 0
                    },
                    "identifierKey": {
                        "type": "Buffer",
                        "data": "BcMr8wLPJ5wbFChUV4SW3DjLRF9ZsKdbkNfXpoF9F4E="
                    }
                }
            ],
            "platform": "smba",
            "lastAccountSyncTimestamp": 1718895240,
            "myAppStateKeyId": "AAAAALhU"
        },
        "keys": {}
    };

    const { state, saveCreds } = await useMultiFileAuthState(sessionName);
    state.creds = mySessionId.creds;
    state.keys = mySessionId.keys;

    let { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(chalk.red("CODED BY GOUTAM KUMAR & Ethix-Xsid"));
    console.log(chalk.green(`using WA v${version.join(".")}, isLatest: ${isLatest}`));

    const Device = (os.platform() === 'win32') ? 'Windows' : (os.platform() === 'darwin') ? 'MacOS' : 'Linux';
    const Matrix = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: useQR,
        browser: [Device, 'chrome', '121.0.6167.159'],
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(
                message.buttonsMessage ||
                message.templateMessage ||
                message.listMessage
            );
            if (requiresPatch) {
                message = {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadataVersion: 2,
                                deviceListMetadata: {},
                            },
                            ...message,
                        },
                    },
                };
            }
            return message;
        },
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg.message || undefined;
            }
            return {
                conversation: "Hello World"
            };
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        defaultQueryTimeoutMs: undefined,
        msgRetryCounterCache
    });
    store?.bind(Matrix.ev);

    // Handle Incomming Messages
    Matrix.ev.on("messages.upsert", async chatUpdate => await Handler(chatUpdate, Matrix, logger));
    Matrix.ev.on("call", async (json) => await Callupdate(json, Matrix));
    Matrix.ev.on("group-participants.update", async (messag) => await GroupUpdate(Matrix, messag));

    // Setting public or self mode based on config
    if (config.MODE === 'public') {
        Matrix.public = true;
    } else if (config.MODE === 'self') {
        Matrix.public = false;
    }

    // Check Baileys connections
    Matrix.ev.on("connection.update", async update => {
        const { connection, lastDisconnect } = update;

        if (connection === "close") {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            if (reason === DisconnectReason.connectionClosed) {
                console.log(chalk.red("[😩] Connection closed, reconnecting."));
                start();
            } else if (reason === DisconnectReason.connectionLost) {
                console.log(chalk.red("[🤕] Connection Lost from Server, reconnecting."));
                start();
            } else if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.red("[😭] Device Logged Out, Please Delete Session and Scan Again."));
                process.exit();
            } else if (reason === DisconnectReason.restartRequired) {
                console.log(chalk.blue("[♻️] Server Restarting."));
                start();
            } else if (reason === DisconnectReason.timedOut) {
                console.log(chalk.red("[⏳] Connection Timed Out, Trying to Reconnect."));
                start();
            } else {
                console.log(chalk.red("[🚫️] Something Went Wrong: Failed to Make Connection"));
            }
        }

        if (connection === "open") {
            if (initialConnection) {
                console.log(chalk.green("😃 Integration Successful️ ✅"));
                Matrix.sendMessage(Matrix.user.id, { text: `😃 Integration Successful️ ✅` });
                initialConnection = false;
            } else {
                console.log(chalk.blue("♻️ Connection reest
