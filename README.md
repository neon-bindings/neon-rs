# `@neon-rs`

Experimental packaging and distribution tooling for [Neon](https://neon-bindings.com).

# Build Workflow of a Neon Project

```
( Start ) ---- npm run build ----> ( .node ) ---- npm run pack-target ----> ( .tgz ) ---- npm publish ----> [ npm ]
 \ \ \ \ \
  \ \ \ \ +--- npm run cross ----> ( .node ) ---- npm run pack-target ----> ( .tgz ) ---- npm publish ----> [ npm ]
   \ \ \ \
    \ \ \ +--- npm run cross ----> ( .node ) ---- npm run pack-target ----> ( .tgz ) ---- npm publish ----> [ npm ]
     \ \ \
      \ \ +--- npm run cross ----> ( .node ) ---- npm run pack-target ----> ( .tgz ) ---- npm publish ----> [ npm ]
       \ \
        \ +--- npm run cross ----> ( .node ) ---- npm run pack-target ----> ( .tgz ) ---- npm publish ----> [ npm ]
         \
          +--- npm run cross ----> ( .node ) ---- npm run pack-target ----> ( .tgz ) ---- npm publish ----> [ npm ]
```
