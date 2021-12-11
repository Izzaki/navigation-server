exports.InputMessage = class InputMessage {
    constructor() {
        this.reset();
    }

    reset() {
        this.m_messageSize = 0;
        this.m_readPos = 0;
        this.m_buffer = [];
    }

    getU8()
    {
        // checkRead(1);
        let v = this.m_buffer[this.m_readPos];
        this.m_readPos += 1;
        return v;
    }

    getU16()
    {
        // checkRead(2);
        let v = this.m_buffer[this.m_readPos] + (this.m_buffer[this.m_readPos+1] << 8);
        this.m_readPos += 2;
        return v;
    }

    getString()
    {
        const stringLength = this.getU16();
        // checkRead(stringLength);
        return this.get(stringLength);
    }

    get(length) {
        const result = this.m_buffer.slice(this.m_readPos, this.m_readPos + length).toString();
        this.m_readPos += length;
        return result;
    }

    setBuffer(buffer)
    {
        let length = buffer.length;
        this.reset();
        // checkWrite(len);
        this.m_buffer = buffer;
        this.m_messageSize = length;
    }
};
