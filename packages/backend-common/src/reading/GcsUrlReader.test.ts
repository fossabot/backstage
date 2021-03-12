/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ConfigReader, JsonObject } from '@backstage/config';
import { getVoidLogger } from '../logging';
import { ReadTreeResponseFactory } from './tree';
import { GcsUrlReader } from './GcsUrlReader';
import { UrlReaderPredicateTuple } from './types';

describe('GcsUrlReader', () => {
  const createReader = (config: JsonObject): UrlReaderPredicateTuple[] => {
    return GcsUrlReader.factory({
      config: new ConfigReader(config),
      logger: getVoidLogger(),
      treeResponseFactory: ReadTreeResponseFactory.create({
        config: new ConfigReader({}),
      }),
    });
  };

  it('does not create a reader without the gcs field', () => {
    const entries = createReader({
      integrations: {},
    });
    expect(entries).toHaveLength(0);
  });

  it('creates a reader with credentials correctly configured', () => {
    const entries = createReader({
      integrations: {
        gcs: [
          {
            privateKey: '--- BEGIN KEY ---- fakekey --- END KEY ---',
            clientEmail: 'someone@example.com',
          },
          {
            host: 'proxy.storage.cloud.google.com',
            privateKey: '--- BEGIN KEY ---- fakekey2 --- END KEY ---',
            clientEmail: 'someone2@example.com',
          },
        ],
      },
    });
    expect(entries).toHaveLength(2);
  });

  it('does not create a reader if the privateKey is missing', () => {
    const entries = createReader({
      integrations: {
        gcs: [
          {
            clientEmail: 'someone@example.com',
          },
        ],
      },
    });
    expect(entries).toHaveLength(0);
  });

  it('does not create a reader if the clientEmail is missing', () => {
    const entries = createReader({
      integrations: {
        gcs: [
          {
            privateKey:
              '-----BEGIN PRIVATE KEY----- fakekey -----END PRIVATE KEY-----',
          },
        ],
      },
    });
    expect(entries).toHaveLength(0);
  });

  it('predicates', () => {
    const readers = createReader({
      integrations: {
        gcs: [
          {
            privateKey:
              '-----BEGIN PRIVATE KEY----- fakekey -----END PRIVATE KEY-----',
            clientEmail: 'someone@example.com',
          },
        ],
      },
    });
    const predicate = readers[0].predicate;
    expect(predicate(new URL('https://storage.cloud.google.com'))).toBe(true);
    expect(
      predicate(
        new URL(
          'https://storage.cloud.google.com/team1/service1/catalog-info.yaml',
        ),
      ),
    ).toBe(true);
    expect(predicate(new URL('https://storage2.cloud.google.com'))).toBe(false);
    expect(predicate(new URL('https://cloud.google.com'))).toBe(false);
    expect(predicate(new URL('https://google.com'))).toBe(false);
    expect(predicate(new URL('https://a.example.com/test'))).toBe(false);
  });
});
