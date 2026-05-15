import 'dotenv/config';
import Hashids from 'hashids';
import { NumberLike } from 'node_modules/hashids/cjs/util';

export class HashId {
  private hashids: Hashids;
    constructor() {
        this.hashids = new Hashids(process.env.HASHID_SALT, Number(process.env.HASHID_MIN_LENGTH));
    }

    public encode(id: number): string {
        return this.hashids.encode(id);
    }

    public decode(hash: string): NumberLike  | null {
        const decoded = this.hashids.decode(hash);
        return decoded.length > 0 ? decoded[0] : null;
    }
}