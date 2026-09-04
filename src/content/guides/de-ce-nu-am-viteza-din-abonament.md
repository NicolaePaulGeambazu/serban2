---
title: "De ce nu am viteza din abonament pe Wi-Fi?"
description: "Cauzele reale, în ordinea în care merită verificate: portul WAN, banda de 2.4 GHz, canalele aglomerate, distanța și limita dispozitivului tău."
kicker: "Routere Wi-Fi"
updated: "2026-09-04"
order: 34
---

Plătești 1 Gbps și telefonul arată 180 Mbps. Înainte să suni la furnizor, verifică lista de mai jos — în **exact ordinea asta**. În majoritatea cazurilor, cauza e printre primele trei și nu ține de abonament.

## 0. Testul care separă problemele

Fă un test de viteză **pe cablu**, direct din router, cu laptopul. Apoi unul pe Wi-Fi, lângă router.

- Pe cablu iese viteza din abonament, pe Wi-Fi nu → problema e **Wi-Fi-ul** sau dispozitivul.
- Nici pe cablu nu iese → problema e **routerul, portul lui WAN** sau linia furnizorului.

Fără acest test, orice altceva e ghicit.

## 1. Portul WAN e Gigabit (cea mai frecventă cauză)

Un port Gigabit se saturează în jurul a **940 Mbps reali**, din cauza overhead-ului de protocol. Deci:

- Abonament de 1 Gbps → maxim ~940 Mbps, niciodată 1000.
- Abonament de 2,5 Gbps pe un router cu porturi Gigabit → **tot ~940 Mbps**. Restul e inaccesibil, hardware-ul nu poate mai mult.

Verifică în specificațiile routerului dacă portul WAN e **2.5G**. Dacă nu e și abonamentul tău depășește 1 Gbps, niciun reglaj nu te ajută — ai nevoie de alt router. Vezi [modelele cu port 2.5G din clasament](/clasament/routere-wifi/).

## 2. Ești conectat pe 2.4 GHz fără să știi

Banda de **2.4 GHz** nu depășește realist **100–150 Mbps**, indiferent de router sau abonament. E lentă prin construcție, în schimb bate departe.

Multe routere afișează un singur nume de rețea și decid singure banda (**band steering**), iar decizia e adesea proastă: telefonul rămâne agățat pe 2.4 GHz mult după ce ai revenit lângă router.

**Ce faci:** intră în setările routerului și separă temporar rețelele, cu nume distincte, de exemplu `Casa-5G` și `Casa-2.4G`. Conectează-te manual pe cea de 5 GHz și repetă testul. Dacă viteza sare, ai găsit cauza.

## 3. Canalele sunt aglomerate

Pe 2.4 GHz există practic **trei** canale care nu se suprapun (1, 6, 11). Într-un bloc, toți vecinii se înghesuie acolo. Pe 5 GHz sunt mai multe canale, dar routerele ieftine aleg des același canal implicit.

**Ce faci:** în setări, treci selecția de canal de pe *Auto* pe un canal fix, mai puțin folosit. Pe 5 GHz, canalele înalte (100+) sunt de obicei mai libere. Dacă ai un router **Wi-Fi 6E sau 7**, mută dispozitivele importante pe banda de **6 GHz** — e aproape goală.

## 4. Distanța, pereții și amplasarea

Viteza pe Wi-Fi scade rapid cu distanța și cu fiecare perete. Un perete de beton armat poate tăia jumătate din semnal, iar la 5 GHz efectul e mai puternic decât la 2.4 GHz.

Routerul trebuie să stea **central, la vedere, la 1–1,5 m de la sol** — nu în dulap, nu pe podea, nu în spatele televizorului, nu lângă microunde sau oglinzi mari.

Dacă o cameră rămâne slabă indiferent ce reglezi, problema e acoperirea și se rezolvă cu un [sistem mesh](/clasament/routere-wifi/mesh/), nu cu setări. Detalii în [router sau sistem mesh](/ghiduri/router-vs-sistem-mesh/).

## 5. Dispozitivul tău e limita

Un telefon sau laptop **Wi-Fi 5** nu va trece de câteva sute de Mbps, oricât de bun e routerul. Multe laptopuri ieftine au plăci wireless cu o singură antenă (1x1), care înjumătățesc viteza maximă față de una cu două antene (2x2).

Testează cu **două dispozitive diferite**, de preferat unul recent. Dacă doar unul e lent, ai găsit vinovatul.

Și verifică portul de rețea al laptopului când testezi pe cablu: multe laptopuri și adaptoare USB-Ethernet ieftine sunt **doar 100 Mbps**, nu Gigabit.

## 6. Aplicația de test și serverul

Testele făcute în aplicația de browser, pe Wi-Fi, cu alte descărcări active în casă, dau rezultate mici fără ca rețeaua să fie de vină. Fă testul:

- Cu restul dispozitivelor **în repaus**.
- Pe un server de test **din România**.
- Din browser, nu din aplicații care rulează în fundal.

## 7. Cablul de rețea

Un cablu vechi **Cat 5** sau unul deteriorat limitează la 100 Mbps. Pentru Gigabit ai nevoie de **Cat 5e** minim, pentru 2.5G de **Cat 6**. Verifică inscripția pe cablu — e tipărită pe manta.

> **Pe scurt:** dacă abonamentul e peste 1 Gbps, verifică întâi **portul WAN**. Dacă e până la 1 Gbps, verifică pe ce **bandă** ești conectat. Aceste două cauze acoperă majoritatea cazurilor.

## Ce așteptări să ai realist

| Situație | Viteză realistă pe Wi-Fi |
|---|---|
| 2.4 GHz, orice router | 60–150 Mbps |
| 5 GHz, Wi-Fi 6, aceeași cameră | 400–800 Mbps |
| 5 GHz, Wi-Fi 6, două camere mai încolo | 150–400 Mbps |
| 6 GHz, Wi-Fi 6E/7, aceeași cameră | 700–1500 Mbps |
| Cablu Gigabit | până la ~940 Mbps |

Wi-Fi-ul nu livrează niciodată viteza din abonament la fel de constant ca un cablu. Dacă ai un PC fix sau un televizor care contează, cablul rămâne cea mai ieftină îmbunătățire posibilă.

Dacă ai ajuns la concluzia că routerul e limita, vezi [clasamentul de routere Wi-Fi](/clasament/routere-wifi/) și [ghidul de alegere](/ghiduri/cum-alegi-router-wifi/).
