/* Keep the previous valid save and never replace an unreadable original silently. */
(function(root) {
  'use strict';
  function create({key, storage, validate, now = Date.now}) {
    const recoveryKey = key + '.last-good';
    let checkpoint = null, damaged = null, blocked = false, archiveKey = null;
    const access = () => typeof storage === 'function' ? storage() : storage;
    function decode(raw) {
      if (raw === null) return null;
      const parsed = JSON.parse(raw);
      validate(parsed);
      return parsed;
    }
    function archiveOriginal() {
      if (damaged === null) return;
      if (!archiveKey) {
        const base = key + '.damaged.' + now();
        let suffix = 0;
        do { archiveKey = base + '.' + suffix++; } while (access().getItem(archiveKey) !== null);
      }
      access().setItem(archiveKey, damaged);
      damaged = null;
    }
    return {
      load() {
        try {
          const raw = access().getItem(key);
          try {
            const value = decode(raw);
            if (value !== null) { checkpoint = raw; return {status: 'loaded', value}; }
          } catch (_) { damaged = raw; }
          try {
            const previous = access().getItem(recoveryKey);
            const value = decode(previous);
            if (value !== null) { checkpoint = previous; return {status: 'recovered', value}; }
          } catch (_) { /* Leave both original keys untouched. */ }
          blocked = damaged !== null;
          return {status: blocked ? 'blocked' : 'empty', value: null};
        } catch (error) {
          blocked = true;
          return {status: 'unavailable', value: null, error: String(error)};
        }
      },
      write(value) {
        if (blocked) return {ok: false, blocked: true};
        try {
          const raw = JSON.stringify(value);
          archiveOriginal();
          if (checkpoint !== null) access().setItem(recoveryKey, checkpoint);
          access().setItem(key, raw);
          checkpoint = raw;
          return {ok: true};
        } catch (error) { return {ok: false, error: String(error)}; }
      },
      startFresh() {
        try {
          archiveOriginal();
          blocked = false;
          checkpoint = null;
          return {ok: true, archiveKey};
        } catch (error) { return {ok: false, error: String(error)}; }
      },
      original() { return damaged; },
      state() { return {blocked, archiveKey}; }
    };
  }
  const api = {create};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameStorage = api;
})(typeof window !== 'undefined' ? window : globalThis);
