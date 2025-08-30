/*! PhotoFeed (GitHub-hosted) – shows all images once before repeating */
(function(){
  class PhotoFeed {
    constructor({container, manifestUrl, imageBaseUrl, storageKey="pf_v1", buttonText="New photo"}){
      this.container = (typeof container==="string") ? document.querySelector(container) : container;
      if(!this.container) throw new Error("PhotoFeed: container not found");

      // build UI if container is empty
      if(!this.container.querySelector(".pf-frame")){
        this.container.classList.add("pf");
        this.container.innerHTML = `
          <div class="pf-frame"><img alt="photo" loading="eager" /></div>
          <button class="pf-next">${buttonText}</button>
          <div class="pf-status"><span data-pf-progress></span></div>
        `;
      }

      this.img = this.container.querySelector("img");
      this.btn = this.container.querySelector("button");
      this.progress = this.container.querySelector("[data-pf-progress]");

      this.manifestUrl = manifestUrl;
      this.imageBaseUrl = imageBaseUrl ? (imageBaseUrl.endsWith("/")?imageBaseUrl:imageBaseUrl+"/") : "";
      this.key = storageKey;

      this.names = [];
      this.urls = [];
      this.order = [];
      this.i = 0;
      this.preloader = null;

      this.next = this.next.bind(this);
      this.btn.addEventListener("click", this.next);
    }

    async init(){
      const r = await fetch(this.manifestUrl, {cache:"no-store"});
      if(!r.ok) throw new Error("PhotoFeed: manifest fetch failed");
      const arr = await r.json();
      const unique = Array.from(new Set(arr.filter(Boolean))); // de-dup defensively
      this.names = unique;

      // if entries are filenames, map to base; if already URLs, pass through
      this.urls = this.names.map(n => /^https?:\/\//i.test(n) ? n : this.imageBaseUrl + encodeURIComponent(n));

      // fingerprint manifest; reset cycle if list changes
      this.fp = this.hash(JSON.stringify(this.names));
      this.restoreOrSeed();
      this.show();
      this.preload();
    }

    hash(s){ // FNV-1a
      let h=2166136261>>>0;
      for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; }
      return h.toString(16);
    }

    restoreOrSeed(){
      let S=null; try{ S=JSON.parse(localStorage.getItem(this.key)||"null"); }catch{}
      const valid = S && Array.isArray(S.order) && Number.isInteger(S.i) && S.fp===this.fp &&
                    S.order.length===this.urls.length && S.i>=0 && S.i<S.order.length;
      if(valid){ this.order=S.order; this.i=S.i; }
      else { this.order=this.shuffle([...this.urls.keys()]); this.i=0; this.persist(); }
    }

    persist(){ localStorage.setItem(this.key, JSON.stringify({order:this.order,i:this.i,fp:this.fp})); }

    shuffle(a){
      for(let k=a.length-1;k>0;k--){ const j=Math.floor(Math.random()*(k+1)); [a[k],a[j]]=[a[j],a[k]]; }
      return a;
    }

    show(){
      const idx=this.order[this.i]; const src=this.urls[idx];
      if(!src) return;
      this.img.src=src;
      const name = this.names[idx] || "";
      if(!/^https?:\/\//.test(name)) this.img.alt = name.replace(/\.[^.]+$/, "");
      if(this.progress) this.progress.textContent = `${this.i+1}/${this.order.length}`;
    }

    preload(){
      const ni=(this.i+1<this.order.length)?this.order[this.i+1]:this.order[0];
      const nextSrc=this.urls[ni]; if(!nextSrc) return;
      this.preloader=new Image(); this.preloader.src=nextSrc;
    }

    next(){
      this.i++;
      if(this.i>=this.order.length){
        this.order=this.shuffle([...this.urls.keys()]);
        this.i=0;
      }
      this.persist(); this.show(); this.preload();
    }

    static mount(opts){ const pf=new PhotoFeed(opts); return pf.init(), pf; }
  }

  // expose
  window.PhotoFeed = PhotoFeed;
})();
