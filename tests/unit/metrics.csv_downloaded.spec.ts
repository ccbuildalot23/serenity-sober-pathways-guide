import { buildCsvDownloadedPayload } from '../serenity-provider-portal/src/utils/metrics';

describe('metrics csv_downloaded payload', () => {
  it('collects unique codes and formats provider/month', () => {
    const payload = buildCsvDownloadedPayload('prov-1', '2025-01', [
      { code: '99490' as any },
      { code: '99439' as any },
      { code: '99490' as any }
    ]);
    expect(payload.provider_id).toBe('prov-1');
    expect(payload.month).toBe('2025-01');
    expect(payload.codes).toEqual(['99490', '99439']);
  });
});


