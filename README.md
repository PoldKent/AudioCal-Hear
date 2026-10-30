# AudioCal Hear

**EN** | [Español](README.es.md)

**AudioCal Hear** is a single-file, mobile-friendly web app for subjective hearing-threshold testing and personalized equalizer suggestions for headphones, speakers, and car audio systems.

**Version:** 1.4 · **App interface:** Spanish (for now) · **Stack:** HTML, CSS, vanilla JavaScript, Web Audio API · **No external libraries**.

> **Safety:** This is *not* a clinical hearing test or an objective acoustic calibration. Its results are approximate, subjective EQ suggestions. Begin at a low, comfortable volume. Do not raise the volume to chase hard-to-hear frequencies. Stop if you experience discomfort or ringing.

## Try it on your phone

1. Connect your headphones, speaker, or car stereo using your phone's **Bluetooth/audio settings**. The browser uses the phone's selected system output; it cannot reliably detect or change the Bluetooth device itself.
2. Open `index.html` in a modern mobile browser. If local-file restrictions interfere, use GitHub Pages over HTTPS (setup below).
3. Choose the equalizer preset (including the exact **7-band car stereo** and **10-band headphones** from the project reference photos), stereo or individual ears, and one or two passes.
4. Check the audio at a quiet, comfortable and unchanged phone volume, in a quiet environment. Keep the vehicle parked throughout the test.
5. Start the adaptive test: first the tone drops by up to **6 dB every 3 seconds**. Tap when it disappears; the app returns to the region and uses **1 dB steps every 3 seconds** to find your threshold.
6. Review estimated settings in **Ajustes**, compare using your local audio file, and enter the suggested settings manually into the device's equalizer.

## New in v1.4 — musical preferences and better feedback

- The result page now distinguishes **completed trials** from **frequencies with a usable threshold**. If a frequency could not be measured, you can retry only those frequencies.
- A new optional **music preference comparison** plays A/B EQ variations on the **same user-selected local audio file**. Three short rounds let you choose softer or more prominent bass, voices and high-frequency detail, or "Same". These deliberate preferences are stored separately from the subjective hearing thresholds.
- To compare the versions, load an audio file, **play it**, listen to **both A and B**, then choose which is more comfortable. The changes are limited to moderate ±2 dB per zone around a broad center. This is not calibrated loudness matching, clinical hearing measurement, or a guaranteed improvement.
- Editing individual gains no longer interrupts the music player. The note about the car stereo's provisional ±6 dB scale only appears when the original **car 7-band preset** is selected.
- **Never test at maximum volume.** The WHO recommends listening below 60% of device maximum in typical personal listening and avoiding uncomfortable sound levels. A phone volume percentage cannot identify acoustic loudness in dB SPL, so use a quiet, comfortably low level and never increase it merely to hear a faint tone.
- The application's headphone and car EQ recommendations must still be manually transferred to hardware. Do not apply an old profile to a different Bluetooth output without new evaluation.

## Supported equalizer presets

| Preset | Center frequencies (Hz) |
| --- | --- |
| Car stereo (7 bands — project reference) | 64, 160, 400, 1000, 2500, 6250, 15625 |
| Headphones (10 bands — project reference) | 30, 60, 120, 250, 500, 1000, 2000, 4000, 8000, 16000 |
| Common 7-band layout | 63, 160, 400, 1000, 2500, 6300, 16000 |
| ISO octave-center 10-band layout | 31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000 |
| Additional options | 5, 15, 31 bands; custom frequencies |

The car stereo's gain range is **provisionally** configured to ±6 dB. The supplied photo confirms a +6 reading, but not the complete scale. Adjust the gain limits to match your equipment.

## Faster test: maximum 57 seconds per frequency and ear

The adaptive sweep keeps the same 3-second listening time at each digital level and skips most unnecessary levels.

| Stage | Steps | Maximum |
| --- | --- | ---: |
| Coarse | −28, −34, −40, −46, −52, −58, −64, −68 dBFS (up to 6 dB per step) | 8 × 3 = **24 s** |
| Fine | Six 1 dB steps at most, close to the missed tone | 6 × 3 = **18 s** |
| Optional verification | Up to five 1 dB levels around the first threshold | 5 × 3 = **15 s** |
| **Total** | | **57 s** |

If no threshold is registered in time, the attempt is marked **undetermined**: the app does not invent a result. This is an upper bound on **automatically played audio**, not pauses, manual retries or time between taps. Testing left and right ears separately doubles the ear/frequency combinations.

| Both channels together | One pass maximum | Two passes maximum |
| --- | ---: | ---: |
| Car, 7 bands | 4 min 54 s | **6 min 39 s** |
| Headphones, 10 bands | 7 min | **9 min 30 s** |

The default is **one pass**. The setup screen adapts estimates to your chosen bands, channels and repetitions. This is not medical audiometry or calibrated sound-pressure measurement.

## Data, audio and privacy

- Profiles are stored locally in the same browser's `localStorage`. Back them up or move them using JSON export/import.
- Your selected A/B comparison music file is processed in the browser, rather than uploaded to an AudioCal Hear server.
- The browser's dBFS values are **digital signal levels**, not calibrated acoustic dB SPL.
- EQ suggestions do not independently measure a loudspeaker's frequency response, room acoustics, or hearing loss.
- The app **does not automatically modify** the car stereo or headphone system EQ; settings must be copied over manually.
- If a frequency is not audible, avoid large compensating boosts and stop if the audio becomes uncomfortable or distorted.

## Publish with GitHub Pages

1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Choose branch `main`, folder `/(root)`, and select **Save**.
4. After GitHub reports that the site has been deployed, open the URL shown there on your phone.

This project is a static HTML file and requires no server build.

## Contributing and permissions

This repository is **public to view**. Public visibility does **not** grant the ability to push changes. Only collaborators with explicit write access can push. Everyone else can propose changes through issues or pull requests, which the maintainer can review and decide whether to merge. See [CONTRIBUTING.md](CONTRIBUTING.md).

No license has been added yet. Public access does not by itself grant an open-source license to redistribute or adapt the software.

## Files

- `index.html` — complete self-contained web app.
- `README.md` — English project instructions.
- `README.es.md` — Spanish project instructions.
- `CHANGELOG.md` / `CHANGELOG.es.md` — version history in both languages.
- `CONTRIBUTING.md` — contribution and access guidelines.
