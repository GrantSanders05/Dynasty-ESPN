export function getAnonVoterKey() {
  const keyName = "dynasty_anon_voter_key";
  let k = localStorage.getItem(keyName);
  if (!k) {
    k = "v_" + crypto.randomUUID();
    localStorage.setItem(keyName, k);
  }
  return k;
}
