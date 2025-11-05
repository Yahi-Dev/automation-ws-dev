import fs from 'fs';
import path from 'path';

const featureName = process.argv[2];

if (!featureName) {
  console.error('Por favor, proporciona un nombre para la feature. Ejemplo: node create-feature.js mi-feature');
  process.exit(1);
}

const basePath = process.cwd();
// const featuresPath = path.join(basePath, 'features', featureName);
// const appPath = path.join(basePath, 'app', featureName);
// const apiPath = path.join(basePath, 'app', 'api', featureName);

const featuresPath = path.join(basePath, 'src', 'features', featureName);
const appPath = path.join(basePath, 'src', 'app', featureName);
const apiPath = path.join(basePath, 'src', 'app', 'api', featureName);

const subFolders = ['components', 'hooks', 'schema', 'services'];

try {
  // Crear estructura en features/
  fs.mkdirSync(featuresPath, { recursive: true });

  subFolders.forEach(folder => {
    const folderPath = path.join(featuresPath, folder);
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`Carpeta creada: ${folderPath}`);
  });

  // Archivo types.ts
  const typesFilePath = path.join(featuresPath, 'types.ts');
  fs.writeFileSync(typesFilePath, `// Tipos para ${featureName}\n\nexport interface ${featureName.charAt(0).toUpperCase() + featureName.slice(1)}Type {\n  id: string;\n  // Define tus tipos aquí\n}\n`);
  console.log(`Archivo creado: ${typesFilePath}`);

  // Archivo validations.ts en schema/
  const validationsFilePath = path.join(featuresPath, 'schema', 'validations.ts');
  const validationsContent = `import { z } from 'zod';\n\n// Esquema de validación para ${featureName}\nexport const ${featureName}Schema = z.object({\n  // Define tus validaciones aquí\n  // Ejemplo:\n  // name: z.string().min(3),\n});\n\nexport type ${featureName.charAt(0).toUpperCase() + featureName.slice(1)}FormValues = z.infer<typeof ${featureName}Schema>;\n`;
  fs.writeFileSync(validationsFilePath, validationsContent);
  console.log(`Archivo creado: ${validationsFilePath}`);

  // Carpeta en app
  fs.mkdirSync(appPath, { recursive: true });
  console.log(`Carpeta creada en app: ${appPath}`);

  // Archivo page.tsx con el nuevo template
  const pageTemplate = `import { AppLayout } from '@/src/components/AppLayout';\nimport React from 'react';\n\n\nconst breadcrumbs = [\n  { title: '${featureName.charAt(0).toUpperCase() + featureName.slice(1)}', href: '#' },\n];\n\nconst ${featureName.charAt(0).toUpperCase() + featureName.slice(1)}Page = () => {\n  return (\n    <AppLayout breadcrumbs={breadcrumbs}>\n      <div className="p-4">\n        <h1 className="text-2xl font-bold">${featureName.charAt(0).toUpperCase() + featureName.slice(1)} Page</h1>\n        <p>Content for the ${featureName.toLowerCase()} page goes here.</p>\n      </div>\n    </AppLayout>\n  );\n};\n\nexport default ${featureName.charAt(0).toUpperCase() + featureName.slice(1)}Page;\n`;

  const pageFilePath = path.join(appPath, 'page.tsx');
  fs.writeFileSync(pageFilePath, pageTemplate);
  console.log(`Archivo creado: ${pageFilePath}`);

  // Crear estructura en app/api/[featureName]
  fs.mkdirSync(apiPath, { recursive: true });
  console.log(`Carpeta API creada: ${apiPath}`);

  // Archivo route.ts en la carpeta API
  const routeTemplate = `import { NextResponse } from 'next/server';\n\nexport async function GET() {\n  try {\n    // Lógica para GET\n    return NextResponse.json({ message: 'GET ${featureName} successful' });\n  } catch (error) {\n    return NextResponse.json({ error: 'Error fetching ${featureName}' }, { status: 500 });\n  }\n}\n\nexport async function POST(request: Request) {\n  try {\n    const body = await request.json();\n    // Lógica para POST\n    return NextResponse.json({ message: '${featureName} created successfully', data: body });\n  } catch (error) {\n    return NextResponse.json({ error: 'Error creating ${featureName}' }, { status: 500 });\n  }\n}\n`;

  const routeFilePath = path.join(apiPath, 'route.ts');
  fs.writeFileSync(routeFilePath, routeTemplate);
  console.log(`Archivo API creado: ${routeFilePath}`);

  console.log(`\nEstructura para "${featureName}" creada exitosamente!`);
} catch (err) {
  console.error('Error al crear la estructura:', err);
}