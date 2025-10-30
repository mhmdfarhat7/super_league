import { Injectable } from '@angular/core';

type Club = { id: string; name: string };
export type Player = {
  id: string;
  clubId: string;
  name: string;
  role: 'starter' | 'sub';
  att: number;
  mid: number;
  def: number;
  position: 'GK' | 'DEF' | 'MID' | 'ATT';
};

type RosterPlayer = { name: string; role: 'starter' | 'sub'; att: number; mid: number; def: number; position: 'GK' | 'DEF' | 'MID' | 'ATT' };
type RosterJson = { [clubId: string]: { name: string; players: RosterPlayer[] } };

@Injectable({ providedIn: 'root' })
export class PlayerDbService {
  private db?: IDBDatabase;
  private openPromise?: Promise<IDBDatabase>;
  // Simple in-memory caches to avoid hammering IndexedDB
  private playersCache: Map<string, Player[]> = new Map();

  private dbName = 'super-league-db';
  private dbVersion = 4; // force a brand-new schema/seed

  private ensureOpen(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);
    if (this.openPromise) return this.openPromise;
    this.openPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.dbVersion);
      req.onupgradeneeded = () => {
        const db = req.result;
        // Drop old stores if present to guarantee a clean DB
        if (db.objectStoreNames.contains('players')) {
          db.deleteObjectStore('players');
        }
        if (db.objectStoreNames.contains('clubs')) {
          db.deleteObjectStore('clubs');
        }
        const clubs = db.createObjectStore('clubs', { keyPath: 'id' });
        const players = db.createObjectStore('players', { keyPath: 'id' });
        players.createIndex('clubId', 'clubId', { unique: false });
      };
      req.onsuccess = () => {
        this.db = req.result;
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
    });
    return this.openPromise;
  }

  async seedIfEmpty(clubs: Club[]) {
    await this.ensureOpen();
    
    console.log('🔍 Seeding check - clubs:', clubs.map(c => c.id));
    
    // Force re-seed if we detect new teams (Bayern and PSG)
    const hasNewTeams = clubs.some(club => club.id === 'bayern' || club.id === 'psg');
    const isReseeded = localStorage.getItem('players.seeded.v6') === '1'; // Updated version for unique IDs
    
    console.log('🔍 Has new teams:', hasNewTeams, 'Is reseeded:', isReseeded);
    
    // Always re-seed if we have new teams, regardless of existing data
    if (hasNewTeams) {
      console.log('🔍 Force re-seeding because new teams detected');
      await this.clearAllData();
    } else if (isReseeded) {
      console.log('🔍 Skipping seed - already reseeded and no new teams');
      return;
    }

    // Check if any players exist
    const existingCount = await this.count('players');
    console.log('🔍 Existing players count:', existingCount);
    
    if (existingCount > 0 && !hasNewTeams) {
      console.log('🔍 Skipping seed - players exist and no new teams');
      localStorage.setItem('players.seeded.v6', '1');
      return;
    }

    // Put clubs
    for (const c of clubs) await this.put('clubs', c);

    // Load official rosters from /rosters.json ONLY (no fallback generation)
    console.log('🔍 Loading rosters from /rosters.json');
    const rosters = await this.tryLoadRosters();
    if (!rosters) {
      console.warn('❌ No rosters.json found or invalid format. Skipping seeding.');
      localStorage.setItem('players.seeded.v6', '1');
      return;
    }
    
    console.log('🔍 Available rosters:', Object.keys(rosters));
    
    for (const c of clubs) {
      const roster = rosters[c.id];
      console.log(`🔍 Processing club ${c.id}:`, roster ? `${roster.players.length} players` : 'NO ROSTER');
      
      if (!roster || !Array.isArray(roster.players) || roster.players.length === 0) {
        console.warn(`❌ No roster found for club ${c.id}, skipping`);
        continue; // skip clubs without official roster
      }
      
      let i = 0;
      for (const rp of roster.players) {
        i += 1;
        const p: Player = {
          id: `${c.id}-${rp.name.toLowerCase().replace(/\s+/g, '-')}-${i}`,
          clubId: c.id,
          name: rp.name,
          role: rp.role,
          att: this.clamp(rp.att, 1, 99),
          mid: this.clamp(rp.mid, 1, 99),
          def: this.clamp(rp.def, 1, 99),
          position: rp.position,
        };
        console.log(`🔍 Seeding player: ${p.name} (${p.id}) for club ${p.clubId}`);
        await this.put('players', p);
      }
      console.log(`✅ Seeded ${i} players for ${c.id}`);
    }

    localStorage.setItem('players.seeded.v6', '1');
  }

  // Optional: programmatic reset + reseed helper
  async resetAndReseed(clubs: Club[]) {
    await new Promise<void>((resolve, reject) => {
      const del = indexedDB.deleteDatabase(this.dbName);
      del.onsuccess = () => resolve();
      del.onerror = () => reject(del.error);
      del.onblocked = () => resolve();
    });
    localStorage.removeItem('players.seeded.v3');
    this.db = undefined;
    this.openPromise = undefined;
    await this.seedIfEmpty(clubs);
  }

  private async tryLoadRosters(): Promise<RosterJson | null> {
    try {
      const res = await fetch('/rosters.json', { cache: 'no-store' });
      if (!res.ok) return null;
      const json = await res.json();
      if (json && typeof json === 'object') return json as RosterJson;
      return null;
    } catch {
      return null;
    }
  }

  async getClubs(): Promise<Club[]> {
    return await this.getAll('clubs');
  }

  async getPlayersByClub(clubId: string): Promise<Player[]> {
    // Return from cache if available
    const cached = this.playersCache.get(clubId);
    if (cached) return cached;

    const callId = Math.random().toString(36).substr(2, 9);
    console.log(`🗄️ [${callId}] getPlayersByClub called with clubId: "${clubId}"`);
    
    await this.ensureOpen();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('players', 'readonly');
      const store = tx.objectStore('players');
      const idx = store.index('clubId');
      const req = idx.getAll(clubId);
      req.onsuccess = () => {
        console.log(`🗄️ [${callId}] getPlayersByClub returning ${req.result.length} players for clubId: "${clubId}"`);
        if (req.result.length > 0) {
          console.log(`🗄️ [${callId}] First player: ${req.result[0].name} (${req.result[0].id}) from club ${req.result[0].clubId}`);
        }
        const result = req.result as Player[];
        // Write-through cache
        this.playersCache.set(clubId, result);
        resolve(result);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async updatePlayer(player: Player): Promise<void> {
    await this.put('players', player);
    // Invalidate cache for this club to ensure fresh data
    this.playersCache.delete(player.clubId);
    console.log(`🔄 Updated player ${player.name} role to ${player.role} and invalidated cache for club ${player.clubId}`);
  }

  async updateClubPlayers(clubId: string, players: Player[]): Promise<void> {
    await this.ensureOpen();
    
    // Clear cache for this club
    this.playersCache.delete(clubId);
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('players', 'readwrite');
      const store = tx.objectStore('players');
      
      // First, delete all existing players for this club
      const idx = store.index('clubId');
      const deleteReq = idx.getAllKeys(clubId);
      
      deleteReq.onsuccess = () => {
        const keysToDelete = deleteReq.result;
        
        // Delete existing players
        const deletePromises = keysToDelete.map(key => 
          new Promise<void>((delResolve, delReject) => {
            const delReq = store.delete(key);
            delReq.onsuccess = () => delResolve();
            delReq.onerror = () => delReject(delReq.error);
          })
        );
        
        Promise.all(deletePromises).then(() => {
          // Add new players
          const addPromises = players.map(player => 
            new Promise<void>((addResolve, addReject) => {
              const addReq = store.add(player);
              addReq.onsuccess = () => addResolve();
              addReq.onerror = () => addReject(addReq.error);
            })
          );
          
          Promise.all(addPromises).then(() => {
            // Update cache
            this.playersCache.set(clubId, players);
            resolve();
          }).catch(reject);
        }).catch(reject);
      };
      
      deleteReq.onerror = () => reject(deleteReq.error);
    });
  }

  async clearAllData() {
    await this.ensureOpen();
    const tx = this.db!.transaction(['players', 'clubs'], 'readwrite');
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const del = tx.objectStore('players').clear();
        del.onsuccess = () => resolve();
        del.onerror = () => reject(del.error);
      }),
      new Promise<void>((resolve, reject) => {
        const del = tx.objectStore('clubs').clear();
        del.onsuccess = () => resolve();
        del.onerror = () => reject(del.error);
      })
    ]);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    // Invalidate caches on clear
    this.playersCache.clear();
    localStorage.removeItem('players.seeded.v3');
    localStorage.removeItem('players.seeded.v4');
    localStorage.removeItem('players.seeded.v5');
  }

  // Low-level helpers
  private async put(storeName: 'clubs' | 'players', value: any): Promise<void> {
    await this.ensureOpen();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private async getAll<T = any>(storeName: 'clubs' | 'players'): Promise<T[]> {
    await this.ensureOpen();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  private async count(storeName: 'clubs' | 'players'): Promise<number> {
    await this.ensureOpen();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }

  private hashString(s: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  private seededRandom(seed: number): () => number {
    let x = seed || 123456789;
    return () => {
      // xorshift32
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      return ((x >>> 0) % 10000) / 10000;
    };
  }

  async updatePlayerRole(playerId: string, newRole: 'starter' | 'sub'): Promise<void> {
    const db = await this.ensureOpen();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['players'], 'readwrite');
      const store = transaction.objectStore('players');
      const request = store.get(playerId);
      
      request.onsuccess = () => {
        const player = request.result;
        if (player) {
          player.role = newRole;
          const updateRequest = store.put(player);
          updateRequest.onsuccess = () => {
            // Clear cache for this club to force refresh
            this.playersCache.delete(player.clubId);
            resolve();
          };
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error(`Player with ID ${playerId} not found`));
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}


