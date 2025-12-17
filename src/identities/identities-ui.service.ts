import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { KEYO_API_BASE } from '../config';

@Injectable()
export class IdentitiesUiService {
  getIdentitiesHtml(): string {
    const projectRoot = process.cwd();
    const staticDir = path.join(projectRoot, 'src', 'static');
    const templatePath = path.join(staticDir, 'index.html');
    const scriptPath = path.join(staticDir, 'js', 'keyo-identities-module.js');

    if (!fs.existsSync(templatePath)) {
      throw new Error('Identities UI template not found');
    }
    if (!fs.existsSync(scriptPath)) {
      throw new Error('Identities UI script not found');
    }

    const template = fs.readFileSync(templatePath, 'utf8');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    const safeScript = scriptContent.replace(/<\/script>/gi, '<\\/script>');

    const tokenEndpoint = '/api/token';
    const keyoBase = KEYO_API_BASE;

    return template
      .replace(/{{MODULE_SCRIPT}}/g, safeScript)
      .replace(/{{TOKEN_ENDPOINT}}/g, tokenEndpoint)
      .replace(/{{KEYO_BASE}}/g, keyoBase);
  }
}

