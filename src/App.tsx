import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { Suspense } from "react";
import { DataProvider } from "./data/store";


function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter basename={__BASE_PATH__}>
        {/* Invisível: lê tudo do banco e mantém a cópia do navegador correta para as telas */}
        <DataProvider>
          <Suspense fallback={<div className="p-4">Carregando...</div>}>
            <AppRoutes />
          </Suspense>
        </DataProvider>
      </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;
