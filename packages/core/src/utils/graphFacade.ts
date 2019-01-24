import {
  createFileSystemBackend,
  FileSystemBackend,
  FilesystemNodeType,
} from '@stoplight/graphite/backends/filesystem';
import { createGraphite } from '@stoplight/graphite/graphite';
import { createOas2HttpPlugin } from '@stoplight/graphite/plugins/http/oas2';
import { createOas3HttpPlugin } from '@stoplight/graphite/plugins/http/oas3';
import { createJsonPlugin } from '@stoplight/graphite/plugins/json';
import { createOas2Plugin } from '@stoplight/graphite/plugins/oas2';

import { IGraphite } from '@stoplight/graphite';
import { NodeCategory } from '@stoplight/graphite/graph/nodes';
import { IHttpOperation } from '@stoplight/types';
import * as fs from 'fs';
import compact = require('lodash/compact');
import { join } from 'path';

export class GraphFacade {
  private fsBackend: FileSystemBackend;
  private graphite: IGraphite;

  constructor() {
    const graphite = (this.graphite = createGraphite());
    graphite.registerPlugins(
      createJsonPlugin(),
      createOas2Plugin(),
      createOas2HttpPlugin(),
      createOas3HttpPlugin()
    );
    this.fsBackend = createFileSystemBackend(process.cwd(), graphite, fs);
  }

  public async createFilesystemNode(fsPath: string | undefined) {
    if (fsPath) {
      const stat = fs.lstatSync(join(process.cwd(), fsPath));
      if (stat.isDirectory()) {
        this.graphite.graph.addNode({
          category: NodeCategory.Source,
          type: FilesystemNodeType.Directory,
          path: fsPath,
        });
        this.fsBackend.readdir(fsPath);
      } else if (stat.isFile()) {
        this.graphite.graph.addNode({
          category: NodeCategory.Source,
          type: FilesystemNodeType.File,
          path: fsPath,
        });
        this.fsBackend.readFile(fsPath);
      }
      return await this.graphite.scheduler.drain();
    }
    return null;
  }

  get httpOperations(): IHttpOperation[] {
    const nodes = this.graphite.graph.virtualNodes.filter(node => node.type === 'http-operation');
    return compact(nodes.map<IHttpOperation>(node => node.data as IHttpOperation));
  }
}
