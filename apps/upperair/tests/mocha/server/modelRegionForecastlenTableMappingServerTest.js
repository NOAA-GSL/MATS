if (!(typeof MochaWeb === 'undefined')) {
    MochaWeb.testOnly(function () {
        describe("ModelOptionsTableMapping", function () {
            it("ModelOptions should mapp real tables", function () {
                const models = matsCollections.CurveParams.find({name:"model"});
                const modelOptions = models.options;
                const regions = matsCollections.CurveParams.find({name:"region"});
                const regionOptions = regions.options;
                const forecastLens = matsCollections.CurveParams.find({name:"forecastlen"});
                const forecastlensOptions = forecastlens.options;
                chai.assert(models);
                chai.assert(modelOptions);
                chai.assert(regions);
                chai.assert(regionOptions);
                chai.assert(forecastLens);
                chai.assert(forecastlensOptions);
            });
        });
    });
}
