import { Names } from 'cdk8s';
import { Construct, Node } from 'constructs';
import { shell } from './_shell';

const PARSE_DIGEST = /digest:\ (sha256:[0-9a-f]+)/;

/**
 * Props for `Image`.
 */
export interface ImageProps {
  /**
   * The docker build context directory (where `Dockerfile` is).
   */
  readonly dir: string;

  /**
   * The registry URL to use.
   *
   * This will be used as the prefix for the image name.
   *
   * For example, if you have a local registry listening on port 500, you can set this to `localhost:5000`.
   *
   * @default "docker.io/library"
   */
  readonly registry?: string;

  /**
   * Docker CLI build command options
   * @see docker build --help
   */
  readonly cmdOpts?: string[];
}

const dockerBuildallowedOptions = [
  '--add-host',
  '--build-arg',
  '--cache-from',
  '--cgroup-parent',
  '--compress',
  '--cpu-period',
  '--cpu-quota',
  '--cpu-shares',
  '--cpuset-cpus',
  '--cpuset-mems',
  '--disable-content-trust',
  '--file',
  '--force-rm',
  '--iidfile',
  '--isolation',
  '--label',
  '--memory',
  '--memory-swap',
  '--network',
  '--no-cache',
  '--output',
  '--platform',
  '--progress',
  '--pull',
  '--quiet',
  '--rm',
  '--secret',
  '--security-opt',
  '--shm-size',
  '--squash',
  '--ssh',
  '--stream',
  '--tag',
  '--target',
  '--ulimit',
];

export class DockerBuildCommandOptionBuilder {
  static removeUnknownOptions(opts: string[]): string[] {
    return opts.filter((opt) => dockerBuildallowedOptions.includes(opt));
  }

  readonly cmdOpts: { [key: string]: any };

  constructor() {
    this.cmdOpts = {};
  }

  addHosts(hosts: string[]) {
    this.addOpts('--add-host', hosts);
    return this;
  }
  buildArgs(args: string[]) {
    this.addOpts('--build-arg', args);
    return this;
  }
  cacheFrom(caches: string[]) {
    this.addOpts('--cache-from', caches);
    return this;
  }
  cgroupParent(cgroup: string) {
    this.addOpts('--cgroup-parent', cgroup);
    return this;
  }
  compress() {
    this.addOpts('--compress');
    return this;
  }
  cpuPeriod(period: number) {
    this.addOpts('--cpu-period', period);
    return this;
  }
  cpuQuota(quota: number) {
    this.addOpts('--cpu-quota', quota);
    return this;
  }
  cpushares(cpuShares: number) {
    this.addOpts('--cpu-shares', cpuShares);
    return this;
  }
  cpusetCpus(cpus: string) {
    this.addOpts('--cpuset-cpus', cpus);
    return this;
  }

  cpusetMems(mems: string) {
    this.addOpts('--cpuset-mems', mems);
    return this;
  }

  disableContentTrust() {
    this.addOpts('--disable-content-trust');
    return this;
  }

  dockerFile(file: string) {
    this.addOpts('--file', file);
    return this;
  }
  forceRm() {
    this.addOpts('--force-rm');
    return this;
  }

  iidFile(file: string) {
    this.addOpts('--iidfile', file);
    return this;
  }

  isolation(isolation: string) {
    this.addOpts('isolation', isolation);
    return this;
  }

  labels(labels: string[]) {
    this.addOpts('--label', labels);
    return this;
  }
  memory(bytes: number) {
    this.addOpts('--memory', bytes);
    return this;
  }
  memorySwap(bytes: number) {
    this.addOpts('--memory-swap', bytes);
    return this;
  }

  network(network: string) {
    this.addOpts('--network', network);
    return this;
  }

  noCache() {
    this.addOpts('--no-cache');
    return this;
  }
  output(outputs: [{ type: string; dest: string }]) {
    this.addOpts(
      '--output',
      outputs.map(({ type, dest }) => `type=${type},dest=${dest}`),
    );
    return this;
  }

  platform(platform: string) {
    this.addOpts('--platform', platform);
    return this;
  }

  progress(type: 'auto' | 'plain' | 'tty') {
    this.addOpts('--progress', type);
    return this;
  }

  pull() {
    this.addOpts('--pull');
    return this;
  }
  quiet() {
    this.addOpts('--quiet');
    return this;
  }

  rm() {
    this.addOpts('--rm');
    return this;
  }
  secret(secrets: string[]) {
    this.addOpts('--secret', secrets);
    return this;
  }

  securityOpt(opts: string[]) {
    this.addOpts('--security-opt', opts);
    return this;
  }

  shmSize(bytes: number) {
    this.addOpts('--shm-size', bytes);
    return this;
  }

  squash() {
    this.addOpts('--squash');
    return this;
  }

  ssh(keysOrAgents: string[]) {
    this.addOpts('--ssh', keysOrAgents);
    return this;
  }

  stream() {
    this.addOpts('--stream');
    return this;
  }

  tag(...tags: string[]) {
    this.addOpts('--tag', [...tags]);
    return this;
  }
  target(target: string) {
    this.addOpts('--target', target);
    return this;
  }

  ulimit(ulimit: string[]) {
    this.addOpts('--ulimit', ulimit);
    return this;
  }

  build(): string[] {
    const opts: string[] = [];
    for (const k in this.cmdOpts) {
      const v = this.cmdOpts[k];

      if (Array.isArray(v)) {
        for (const index in v) {
          opts.push(k);
          opts.push(v[index] as string);
        }
      } else if (typeof v === 'string') {
        opts.push(k);
        opts.push(v);
      } else {
        opts.push(k);
      }
    }

    return opts;
  }

  protected addOpts(opt: string, value?: any) {
    if (!Object.keys(this.cmdOpts).includes(opt)) {
      this.cmdOpts[opt] = value;
    }
  }
}

/**
 * Represents a docker image built during synthesis from a context directory
 * (`dir`) with a `Dockerfile`.
 *
 * The image will be built using `docker build` and then pushed through `docker
 * push`. The URL of the pushed image can be accessed through `image.url`.
 *
 * If you push to a registry other then docker hub, you can specify the registry
 * URL through the `registry` option.
 */
export class Image extends Construct {
  /**
   * The image URL to use in order to pull this instance of the image.
   */
  public readonly url: string;

  constructor(scope: Construct, id: string, props: ImageProps) {
    super(scope, id);
    const registry = props.registry ?? 'docker.io/library';
    const tag = `${registry}/${Names.toDnsLabel(Node.of(this).path)}`;
    const cmdOpts = props.cmdOpts || [];
    console.error(`building docker image "${props.dir}"...`);
    shell('docker', 'build', ...[...cmdOpts, ...['--tag', tag, props.dir]]);
    console.error(`pushing docker image "${props.dir}"...`);

    const push = shell('docker', 'push', tag);

    const result = PARSE_DIGEST.exec(push);
    if (!result) {
      throw new Error(`unable to read image digest after push: ${push}`);
    }

    this.url = `${tag}@${result[1]}`;
  }
}
