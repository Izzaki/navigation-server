exports.Client = class Client {
    constructor(socket) {
        this.socket = socket;
    }

    initialize(id, name, role) {
        this.id = id;
        this.name = name;
        this.role = role;
    }

    updateSerialized(serializedPayload) {
        this.serializedUpdatePayload = serializedPayload;
    }
};
