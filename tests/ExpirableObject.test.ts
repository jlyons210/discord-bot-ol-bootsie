import {
  FeatureToken,
  FeatureTokenBucket,
} from '../src/lib/DiscordBot';

const bucket = new FeatureTokenBucket();

setInterval(() => {
  console.log(`og_grumple token count: ${bucket.tokenCount('my-test-feature', 'og_grumple')}`);
  bucket.add(new FeatureToken({
    expireSec: 15,
    feature: 'my-test-feature',
    username: 'og_grumple',
  }));
}, 5000);

setInterval(() => {
  console.log(`Gorgathor token count: ${bucket.tokenCount('my-test-feature', 'Gorgathor')}`);
  bucket.add(new FeatureToken({
    expireSec: 15,
    feature: 'my-test-feature',
    username: 'Gorgathor',
  }));
}, 2000);

setInterval(() => {
  if (bucket.objects.length) {
    console.log(`bucket.objects.length = ${bucket.objects.length}`);

    let i = 0;
    bucket.objects.forEach(obj => {
      const token = (obj as FeatureToken);
      console.log(`obj(${i}).feature = ${token.feature}`);
      console.log(`obj(${i}).username = ${token.username}`);
      // console.log(`obj(${i}).expireSec = ${token.expireSec}`);
      // console.log(`obj(${i}).timestamp = ${token.timestamp}`);
      console.log(`obj(${i}).ttl = ${token.ttl}\n`);
      i++;
    });

    console.log('-'.repeat(80));
  }
  else {
    console.log('bucket.objects is empty.');
  }
}, 1000);