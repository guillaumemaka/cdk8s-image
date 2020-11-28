import { Testing } from 'cdk8s';
import { Image } from '../src';
import * as shell from '../src/_shell';
import { DockerBuildCommandOptionBuilder } from './../src/image';

afterAll(() => {
  jest.resetAllMocks();
});

test('minimal usage', () => {
  // GIVEN
  const mock = jest
    .spyOn(shell, 'shell')
    .mockReturnValue('text\ntext\n\ndigest: sha256:a1b2c3\n');
  const chart = Testing.chart();
  const cmdOpts = new DockerBuildCommandOptionBuilder()
    .target('production')
    .tag('image1', 'image2')
    .build();

  // WHEN
  const image = new Image(chart, 'my-image', {
    dir: 'foobar',
    cmdOpts,
  });

  // THEN
  expect(image.url).toEqual(
    'docker.io/library/test-my-image-ae2c8598@sha256:a1b2c3',
  );
  expect(mock).toBeCalledTimes(2);
  expect(mock).toBeCalledWith(
    'docker',
    'build',
    '--target',
    'production',
    '--tag',
    'image1',
    '--tag',
    'image2',
    '--tag',
    'docker.io/library/test-my-image-ae2c8598',
    'foobar',
  );
  expect(mock).toBeCalledWith(
    'docker',
    'push',
    'docker.io/library/test-my-image-ae2c8598',
  );
});
