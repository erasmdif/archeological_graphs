# US Object Analytics Dashboard

Ambiente web statico, pubblicabile su GitHub Pages, per visualizzare conteggi archeologici aggregati per US, evidence, sito e construction type.

## Cosa include la v7

- quattro dataset supportati:
  - `material_class`;
  - `morphological_class`;
  - `category_obj`;
  - combinazioni `morphological_class × material_class`;
- demo sintetici/inventati, con stessa struttura dei dati reali;
- UI separata tra:
  - controlli dei grafici;
  - controlli e utility della mappa;
- caricamento più elastico dei dati già aggregati:
  - il nome del file può essere qualunque;
  - se ci sono colonne `n_*`, vengono usate come categorie;
  - se non ci sono colonne `n_*`, vengono usati i campi numerici come categorie;
  - se i nomi dei campi descrittivi non coincidono con quelli attesi, la dashboard mostra una mappatura tramite menù a tendina;
- supporto a `combo_counts_json` per la query dinamica JSON delle combinazioni materiale × morfologia;
- pagina `catalog.html` con modalità singolo record e confronto affiancato;
- supporto a `id_site_fdm` come identificativo ufficiale del sito;
- supporto a `evidence_type` come nuovo livello di raggruppamento;
- supporto a `chrono_gen` come filtro multi-scelta e livello di raggruppamento, con gestione dei range cronologici `8-6`.

## Avvio rapido locale

```bash
python3 -m http.server 8000
```

Poi apri:

```text
http://localhost:8000
```

## Pubblicazione GitHub Pages

La dashboard non richiede build, backend o installazione. È sufficiente pubblicare i file statici del progetto.

## Dati demo

I file nella cartella `data/` sono sintetici e servono solo per testare interfaccia, grafici, catalogo e mappa:

- `data/m_class.geojson`
- `data/morpho.geojson`
- `data/category_obj.geojson`
- `data/material_morph_combo.geojson`

## Formato consigliato dei dati aggregati

Il formato più comodo è un GeoJSON `FeatureCollection` con una feature per ogni US e proprietà come:

- `id_su`
- `su_fid`
- `su_dscu`
- `id_evd`
- `evidence_id_old_str`
- `construction_type`
- `id_site_fdm`
- `site_code`
- `evidence_type`
- `chrono_gen`
- `municipality`
- `locality`
- `address`
- `site_group`
- colonne numeriche di conteggio, preferibilmente nel formato `n_*`.

Se usi nomi diversi per i campi descrittivi, il caricamento mostra una sezione di mappatura. Le colonne numeriche extra vengono trattate come categorie, se non ci sono colonne `n_*` o colonne attese.


## Cronologie

Il campo `chrono_gen` può contenere valori singoli o multipli separati da punto e virgola, per esempio:

```text
7
5; 7
7-6
8-6; 7
```

La dashboard espande i range: `8-6` vale per `8`, `7` e `6`. Il toggle **Escludi range dubbi** mantiene solo le US in cui la cronologia filtrata compare anche come valore singolo tra i blocchi separati da `;`.

## Query combinatoria dinamica

Per il dataset `Morphology × Material`, la dashboard accetta sia un formato wide con colonne `n_*`, sia una colonna JSON dinamica, per esempio:

```json
{
  "n_jar_impasto_fine_ware": 2,
  "n_pin_bronze": 1
}
```

La colonna può chiamarsi:

- `combo_counts_json`
- `combo_json`
- `counts_json`
- `combo_counts`

## Librerie CDN

- Chart.js
- Leaflet
- PapaParse
- Bootstrap Icons


## Decorations

La sezione `decorations.html` consente di caricare e visualizzare l’output della query oggetto × decorazione. Supporta filtro cronologico, conteggio per decorazione completa / tecnica / ornato, grafico donut, tendenza per US/evidence/sito, matrice tecnica × ornato, matrice decorazione × posizione e correlazione con material class o morphological class quando questi campi sono presenti nel dataset.

Demo inclusa: `data/decorations.geojson`.

## Aggiornamento v10

- La pagina `decorations.html` usa ora un unico box grafico con pulsanti switchabili, coerente con la dashboard principale.
- I grafici della dashboard principale, del catalogo e della sezione decorations hanno pulsanti di download per:
  - PNG del grafico attivo;
  - CSV dei dati filtrati/usati per la visualizzazione;
  - GeoJSON degli stessi dati;
  - ZIP con PNG + CSV + GeoJSON + metadati.
- Gli export rispettano i filtri correnti dell’utente, inclusi dataset, raggruppamento, filtro cronologico, modalità strict per i range e categorie attive.
