import { ChatCommandParserService } from './chat-command-parser.service';

describe('ChatCommandParserService', () => {
  const parser = new ChatCommandParserService();

  it('parses slash play commands', async () => {
    await expect(parser.parse('/play stronger kanye west')).resolves.toEqual({
      command: 'play',
      rawMessage: '/play stronger kanye west',
      query: 'stronger kanye west',
    });
  });

  it('parses natural language play commands', async () => {
    await expect(parser.parse('pon around the world')).resolves.toEqual({
      command: 'play',
      rawMessage: 'pon around the world',
      query: 'around the world',
    });
  });

  it('parses accents in now playing requests', async () => {
    await expect(parser.parse('qué suena')).resolves.toEqual({
      command: 'nowplaying',
      rawMessage: 'qué suena',
    });
  });

  it('returns unknown for unsupported text', async () => {
    await expect(parser.parse('haz magia')).resolves.toEqual({
      command: 'unknown',
      rawMessage: 'haz magia',
    });
  });

  it('parses playlist create commands', async () => {
    await expect(parser.parse('/playlist create favoritas')).resolves.toEqual({
      command: 'playlist',
      rawMessage: '/playlist create favoritas',
      playlistAction: 'create',
      playlistName: 'favoritas',
    });
  });

  it('parses playlist add commands', async () => {
    await expect(
      parser.parse('/playlist add favoritas :: stronger kanye west'),
    ).resolves.toEqual({
      command: 'playlist',
      rawMessage: '/playlist add favoritas :: stronger kanye west',
      playlistAction: 'add',
      playlistName: 'favoritas',
      playlistQuery: 'stronger kanye west',
    });
  });

  it('parses playlist delete commands', async () => {
    await expect(parser.parse('/playlist delete favoritas')).resolves.toEqual({
      command: 'playlist',
      rawMessage: '/playlist delete favoritas',
      playlistAction: 'delete',
      playlistName: 'favoritas',
    });
  });

  it('parses playlist play shortcut commands', async () => {
    await expect(parser.parse('/playlist favoritas')).resolves.toEqual({
      command: 'playlist',
      rawMessage: '/playlist favoritas',
      playlistAction: 'play',
      playlistName: 'favoritas',
    });
  });

  it('parses natural language playlist delete commands', async () => {
    await expect(parser.parse('borra la playlist favoritas')).resolves.toEqual({
      command: 'playlist',
      rawMessage: 'borra la playlist favoritas',
      playlistAction: 'delete',
      playlistName: 'favoritas',
    });
  });
});
