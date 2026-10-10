import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));

test('the host entry imports without a browser or native dependencies', async () => {
  const host = await import(new URL(manifest.main, root));
  assert.deepEqual(host.inject, []);
  assert.equal(typeof host.apply, 'function');
  assert.doesNotThrow(() => host.apply());
});

test('manifest entry points and DSH bundle reference packaged files', async () => {
  assert.equal(manifest.type, 'module');
  assert.equal(manifest.dsh.client.platform, 'web');
  assert.ok(manifest.dsh.engines.dsh);
  const paths = [manifest.main, ...Object.values(manifest.exports), manifest.dsh.bundle.patch, manifest.icon];
  for (const path of paths) {
    assert.equal(typeof path, 'string');
    if (path.includes('*')) {
      assert.equal(path, './locale/*');
      assert.ok(manifest.files.includes('locale'));
      await access(new URL('locale/en.json', root));
      continue;
    }
    await access(new URL(path, root));
    const normalized = path.replace(/^\.\//, '');
    if (normalized !== 'package.json') assert.ok(manifest.files.includes(normalized), `${path} must ship in npm package`);
  }
});

test('all published locale dictionaries provide native DSH metadata', async () => {
  const files = await readdir(new URL('locale/', root));
  assert.deepEqual(files.filter(name => name.endsWith('.json')).sort(), ['en.json', 'ja.json', 'ru.json', 'zh-CN.json', 'zh-TW.json', 'zh.json'].sort());
  assert.equal(manifest.exports['./locale/*'], './locale/*');
  for (const file of files) {
    const dictionary = JSON.parse(await readFile(new URL(`locale/${file}`, root), 'utf8'));
    assert.deepEqual(Object.keys(dictionary), ['meta']);
    assert.deepEqual(Object.keys(dictionary.meta).sort(), ['description', 'title']);
    for (const value of Object.values(dictionary.meta)) assert.ok(typeof value === 'string' && value.trim().length > 0);
    assert.equal(import.meta.resolve(`${manifest.name}/locale/${file}`), new URL(`locale/${file}`, root).href);
  }
  assert.equal(await readFile(new URL('locale/zh.json', root), 'utf8'), await readFile(new URL('locale/zh-CN.json', root), 'utf8'));
});

test('host bundle and browser module use the published package name', async () => {
  const patch = await readFile(new URL(manifest.dsh.bundle.patch, root), 'utf8');
  const client = await readFile(new URL(manifest.exports['./client'], root), 'utf8');
  assert.match(patch, new RegExp(`name:\\s*${manifest.name}\\s*(?:\\n|$)`));
  assert.ok(client.includes(`id: '${manifest.name}'`));
});
