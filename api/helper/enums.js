const enums = {
    FLAG: {
        value: [1, 2, 3],
        desc: { 1: 'Active', 2: 'Inactive', 3: 'Delete' },
        default: 1
    },
    USERSTATUS: {
        value: [0, 1],
        desc: { 0: 'Not Playing', 1: 'Playing' },
        default: 0
    },
    GAMETYPEMULTIPLAYER: {
        value: ["MULTIPLAYER"],
        default: "MULTIPLAYER"
    },
    GAMEROOMRULE: {
        value: [0, 1],
        desc: { 0: 'Public', 1: 'Private' },
        default: 0
    },
    GAMESTATUS: {
        value: [0, 1, 2, 3],
        desc: { 0: 'waiting', 1: 'active', 2: 'completed', 3: 'Abandon' },
        default: 0
    }
}

module.exports = enums