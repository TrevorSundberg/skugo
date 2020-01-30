import "./spinner.css";
import $ from "jquery";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const html = require("./spinner.html").default;

export class Spinner {
  public root: JQuery;

  public constructor () {
    this.root = $(html);
    $(document.body).append(this.root);
  }

  public hide () {
    this.root.remove();
  }
}
