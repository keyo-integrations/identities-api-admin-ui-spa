import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { IdentitiesUiService } from './identities-ui.service';

@Controller()
export class IdentitiesUiController {
  constructor(private readonly identitiesUiService: IdentitiesUiService) {}

  @Get()
  serveIdentities(@Res() res: Response) {
    const html = this.identitiesUiService.getIdentitiesHtml();
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}

