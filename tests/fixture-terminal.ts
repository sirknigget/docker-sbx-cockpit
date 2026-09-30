import {
  TerminalTransport,
  type TerminalProcess,
} from '../server/inspection-terminal-transport';

/** Deterministic terminal with no process creation or real CLI access. */
export class FixtureTerminalTransport extends TerminalTransport {
  commands: string[] = [];

  start(
    name: string,
    output: (text: string) => void,
    exit: (code: number | null) => void,
  ): TerminalProcess {
    queueMicrotask(() => output(`Fixture Bash in ${name}\n`));

    return {
      write: (input) => {
        this.commands.push(input);

        if (input.trim() === 'pwd') output('/workspace/atlas-api\n');
        else if (input.trim() === 'whoami') output('fixture-user\n');
        else output('Fixture command completed\n');
      },
      close: () => exit(0),
    };
  }
}
