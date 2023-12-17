import Util from "./Util";
import {Config} from "./Config";
import Inventory from "./Inventory";
import Manager from "./Manager";
import Insertion from "./Insertion";

export class AdManager {
    constructor(newConfig) {
        newConfig = newConfig || false;
        if (!newConfig) {
            throw new Error('Please provide a config.');
        }

        this.Util = new Util;
        this.Config = new Config;
        this.Config.init(newConfig);

        this.Inventory = new Inventory(this.Config, this.Util);
        this.Manager = new Manager(this.Config, this.Inventory, this.Util);
        this.Insertion = new Insertion(this.Config, this.Inventory, this.Util);

        this.Insertion.init();
        this.Manager.init();
    }
}