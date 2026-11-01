// Historical optional loudness records remain readable for imported profiles.
// V2 measures relative loudness immediately after each frequency threshold.
// The old independent matching interface and its duplicate audio controls are gone.
function resetLoudnessSession(){stopTone()}
function loudnessEligibleBands(p){
 return p.bands.filter(f=>f>=100&&f<=10000&&Math.abs(Math.log2(f/1000))>.08);
}
