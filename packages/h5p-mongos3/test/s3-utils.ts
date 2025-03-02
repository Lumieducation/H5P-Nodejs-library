import { S3 } from '@aws-sdk/client-s3';

import { deleteObjects } from '../src/S3Utils';

export async function emptyAndDeleteBucket(
    s3: S3,
    bucketname: string
): Promise<void> {
    try {
        await s3.headBucket({
            Bucket: bucketname
        });
    } catch {
        return;
    }
    let ret;
    do {
        ret = await s3.listObjectsV2({
            Bucket: bucketname,
            ContinuationToken: ret?.NextContinuationToken
        });
        if (ret.Contents?.length > 0) {
            await deleteObjects(
                ret.Contents.map((c) => c.Key),
                bucketname,
                s3
            );
        }
    } while (ret.IsTruncated);
    await s3.deleteBucket({ Bucket: bucketname });
}
