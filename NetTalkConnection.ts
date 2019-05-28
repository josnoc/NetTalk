import * as tls from "tls";
import * as tcp from "net";

interface IEventCallbacks {
  dataReceived: (connection: NetTalkConnection, data: string) => void;
  timeOut: (connection: NetTalkConnection) => void;
}

interface IEventCallbackParams {
  dataReceived: [NetTalkConnection, string];
  timeOut: [NetTalkConnection];
}

interface INetTalkConnectionOptions {
  socket: tls.TLSSocket | tcp.Socket;
  id: number;
  delimiter?: string;
  timeOut?: number;
  keepAlive: number;
}

export default class NetTalkConnection {
  private socket: tls.TLSSocket | tcp.Socket;
  private id: number;
  private delimiter: string;
  private eventCallbacks = {} as IEventCallbacks;

  constructor(options: INetTalkConnectionOptions) {
    validateParametters(options.socket);
    this.socket = options.socket;
    this.id = options.id;
    this.delimiter = options.delimiter ? options.delimiter : "\0";

    if (options.keepAlive) this.socket.setKeepAlive(true, options.keepAlive);
    if (options.timeOut) this.socket.setTimeout(options.timeOut);

    this.socket.on("data", this.onDataReceived);
    this.socket.on("timeout", this.onTimeOut);
  }

  on<event extends keyof IEventCallbacks>(
    event: event,
    listener: IEventCallbacks[event]
  ) {
    this.eventCallbacks[event] = listener;
  }

  private call<Event extends keyof IEventCallbacks>(
    event: Event,
    ...params: IEventCallbackParams[Event]
  ) {
    if (this.eventCallbacks[event])
      (<any>this.eventCallbacks[event])(...params);
  }

  private onDataReceived = (data: Buffer) => {
    if (data.readInt8(data.length - 1) === this.delimiter.charCodeAt(0)) {
      this.call(
        "dataReceived",
        this,
        data.toString("utf8", 0, data.length - 1)
      );
    }
  };

  private onTimeOut = () => {
    console.log(
      `Connection No. ${this.id} (${this.socket.remoteAddress}) has timedOut`
    );
    this.call("timeOut", this);
    this.socket.destroy();
  };

  get UUID() {
    return this.id;
  }
}

const validateParametters = (socket: tls.TLSSocket | tcp.Socket) => {
  if (
    !socket ||
    (!(socket instanceof tls.TLSSocket) && !(socket instanceof tcp.Socket))
  ) {
    const error = new Error(
      `Invalid Socket provided: Expected tls.TLSSocket | net.Socket but received ${
        socket ? socket.constructor.name : "undefined"
      }`
    );
    throw error;
  }
};
