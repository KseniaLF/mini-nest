import { RequestContext } from "../context/request-context";
import { Injectable } from "../decorators/injectable";

@Injectable()
export class RequestIdReader {
  getRequestId(): string {
    return RequestContext.requestId;
  }
}

@Injectable()
export class RequestInfoService {
  constructor(private readonly requestIdReader: RequestIdReader) {}

  getRequestId(): string {
    return this.requestIdReader.getRequestId();
  }
}
