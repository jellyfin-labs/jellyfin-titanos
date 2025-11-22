import { paths } from './_utils.ts';
import polka from 'polka';
import serve from 'serve-static';

const port = 3000;

const app = polka();
app.use(serve(paths.distNativeshell));
app.use(serve(paths.distPackage));
app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
