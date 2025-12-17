/**
 * Wipe Supabase Storage Bucket
 *
 * This script empties the proof upload storage bucket.
 * WARNING: This will DELETE ALL uploaded proof images permanently!
 *
 * Usage:
 *   npx tsx scripts/wipe-storage.ts
 *
 * Or add to package.json scripts:
 *   "wipe:storage": "tsx scripts/wipe-storage.ts"
 *
 * Required environment variables (from .env.local):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - NEXT_PUBLIC_PROOF_BUCKET
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = process.env.NEXT_PUBLIC_PROOF_BUCKET;

async function wipeStorage() {
  console.log('\n🗑️  Supabase Storage Wipe Script');
  console.log('================================\n');

  // Validate environment variables
  if (!SUPABASE_URL) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
    process.exit(1);
  }

  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  if (!BUCKET_NAME) {
    console.error('❌ Missing NEXT_PUBLIC_PROOF_BUCKET in .env.local');
    process.exit(1);
  }

  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}\n`);

  // Confirmation prompt
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question(
      '⚠️  WARNING: This will DELETE ALL files in the bucket. Type "DELETE" to confirm: ',
      resolve
    );
  });
  rl.close();

  if (answer !== 'DELETE') {
    console.log('\n❌ Aborted. No files were deleted.');
    process.exit(0);
  }

  console.log('\n🔄 Connecting to Supabase...');

  // Create Supabase client with service role key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // List all files in the bucket
    console.log('📋 Listing files in bucket...');

    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', {
        limit: 1000,
        offset: 0,
      });

    if (listError) {
      throw new Error(`Failed to list files: ${listError.message}`);
    }

    if (!files || files.length === 0) {
      console.log('\n✅ Bucket is already empty. Nothing to delete.');
      process.exit(0);
    }

    console.log(`📁 Found ${files.length} file(s) to delete.\n`);

    // Get all file paths (handle nested folders recursively)
    const filePaths = await getAllFilePaths(supabase, BUCKET_NAME, '');

    if (filePaths.length === 0) {
      console.log('\n✅ No files found. Bucket is empty.');
      process.exit(0);
    }

    console.log(`🗑️  Deleting ${filePaths.length} file(s)...`);

    // Delete files in batches of 100
    const batchSize = 100;
    let deletedCount = 0;

    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);

      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(batch);

      if (deleteError) {
        console.error(`❌ Error deleting batch: ${deleteError.message}`);
      } else {
        deletedCount += batch.length;
        console.log(`   Deleted ${deletedCount}/${filePaths.length} files...`);
      }
    }

    console.log(`\n✅ Successfully deleted ${deletedCount} file(s) from "${BUCKET_NAME}" bucket.`);

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Recursively get all file paths in a bucket
 */
async function getAllFilePaths(
  supabase: any,
  bucketName: string,
  folder: string
): Promise<string[]> {
  const paths: string[] = [];

  const { data: items, error } = await supabase.storage
    .from(bucketName)
    .list(folder, { limit: 1000 });

  if (error) {
    console.error(`Error listing folder "${folder}": ${error.message}`);
    return paths;
  }

  if (!items) return paths;

  for (const item of items) {
    const itemPath = folder ? `${folder}/${item.name}` : item.name;

    if (item.id) {
      // It's a file
      paths.push(itemPath);
    } else {
      // It's a folder, recurse into it
      const subPaths = await getAllFilePaths(supabase, bucketName, itemPath);
      paths.push(...subPaths);
    }
  }

  return paths;
}

// Run the script
wipeStorage();
