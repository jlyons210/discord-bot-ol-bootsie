import {
  FeatureToken,
  FeatureTokenBucket,
  FeatureTokenBucketMaxUserTokensError,
} from '../src/lib/ExpirableObject/FeatureToken';

const testFeatureBucket = new FeatureTokenBucket({ maxTokens: 5, tokenExpireSec: 30 });

setInterval(() => {
  try {
    testFeatureBucket.add(new FeatureToken({ username: 'og_grumple' }));
  }
  catch (e) {
    if (e instanceof FeatureTokenBucketMaxUserTokensError) {
      console.log(`*** ${e.message}`);
    }
  }
}, 4000);

setInterval(() => {
  try {
    testFeatureBucket.add(new FeatureToken({ username: 'Gorgathor' }));
  }
  catch (e) {
    if (e instanceof FeatureTokenBucketMaxUserTokensError) {
      console.log(`*** ${e.message}`);
    }
  }
}, 2000);

setInterval(() => {
  if (testFeatureBucket.objects.length) {
    console.log(`bucket.objects.length = ${testFeatureBucket.objects.length}`);
    console.log(`og_grumple tokens left: ${testFeatureBucket.tokensRemaining('og_grumple')}`);
    console.log(`Gorgathor tokens left: ${testFeatureBucket.tokensRemaining('Gorgathor')}`);
    console.log('-'.repeat(80));

    let i = 0;
    testFeatureBucket.objects.forEach(obj => {
      const token = (obj as FeatureToken);
      console.log(`token(${i}).username = ${token.username}, .ttl = ${token.ttl}`);
      i++;
    });

    console.log('-'.repeat(80));
  }
  else {
    console.log('bucket.objects is empty.');
  }
}, 1000);