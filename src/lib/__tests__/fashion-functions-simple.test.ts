import { 
  FashionFunctions,
  MeasurementCalculatorSchema
} from "../fashion-functions";

describe("Fashion Functions", () => {
  describe("MeasurementCalculatorSchema validation", () => {
    it("validates correct dress parameters", () => {
      const validParams = {
        garmentType: "dress" as const,
        measurements: {
          bust: 36,
          waist: 28,
          hip: 38,
          length: 36
        },
        fabricWidth: 45
      };

      expect(() => MeasurementCalculatorSchema.parse(validParams)).not.toThrow();
    });

    it("rejects invalid garment types", () => {
      const invalidParams = {
        garmentType: "invalid" as "dress" | "blouse" | "pants" | "skirt",
        measurements: { bust: 36 },
        fabricWidth: 45
      };

      expect(() => MeasurementCalculatorSchema.parse(invalidParams)).toThrow();
    });
  });

  describe("calculateMeasurements", () => {
    it("calculates fabric for basic dress", () => {
      const params = {
        garmentType: "dress" as const,
        measurements: {
          bust: 36,
          waist: 28,
          hip: 38,
          length: 36
        },
        fabricWidth: 45
      };

      const result = FashionFunctions.calculateMeasurements(params);

      expect(result).toHaveProperty("fabricYardage");
      expect(result).toHaveProperty("patternPieces");
      expect(result.fabricYardage).toBeGreaterThan(0);
      expect(result.patternPieces).toBeInstanceOf(Array);
      expect(result.patternPieces.length).toBeGreaterThan(0);
    });

    it("calculates fabric for different garment types", () => {
      const dressParams = {
        garmentType: "dress" as const,
        measurements: { bust: 36, waist: 28, hip: 38, length: 36 },
        fabricWidth: 45
      };

      const skirtParams = {
        garmentType: "skirt" as const,
        measurements: { waist: 28, hip: 38, length: 24 },
        fabricWidth: 45
      };

      const dressResult = FashionFunctions.calculateMeasurements(dressParams);
      const skirtResult = FashionFunctions.calculateMeasurements(skirtParams);

      expect(dressResult.fabricYardage).toBeGreaterThan(skirtResult.fabricYardage);
      expect(dressResult.patternPieces.length).toBeGreaterThan(skirtResult.patternPieces.length);
    });
  });

  describe("getTechniqueGuide", () => {
    it("generates guide for valid technique", () => {
      const params = {
        technique: "bust_dart" as const,
        skillLevel: "beginner" as const,
        fabricType: "woven" as const
      };

      const result = FashionFunctions.getTechniqueGuide(params);

      expect(result).toHaveProperty("steps");
      expect(result).toHaveProperty("difficultyLevel");
      expect(result.steps).toBeInstanceOf(Array);
      expect(result.steps.length).toBeGreaterThan(0);
    });

    it("adjusts for different skill levels", () => {
      const beginnerParams = {
        technique: "bust_dart" as const,
        skillLevel: "beginner" as const
      };

      const advancedParams = {
        technique: "bust_dart" as const,
        skillLevel: "advanced" as const
      };

      const beginnerResult = FashionFunctions.getTechniqueGuide(beginnerParams);
      const advancedResult = FashionFunctions.getTechniqueGuide(advancedParams);

      expect(beginnerResult.difficultyLevel).toBeDefined();
      expect(advancedResult.difficultyLevel).toBeDefined();
      expect(typeof beginnerResult.difficultyLevel).toBe("string");
      expect(typeof advancedResult.difficultyLevel).toBe("string");
    });
  });

  describe("getIllustratorHelp", () => {
    it("generates help for valid task", () => {
      const params = {
        task: "technical_flat" as const,
        skillLevel: "intermediate" as const,
        garmentType: "dress" as const
      };

      const result = FashionFunctions.getIllustratorHelp(params);

      expect(result).toHaveProperty("stepByStep");
      expect(result).toHaveProperty("tools");
      expect(result.stepByStep).toBeInstanceOf(Array);
      expect(result.stepByStep.length).toBeGreaterThan(0);
    });

    it("provides appropriate guidance for beginners", () => {
      const params = {
        task: "basic_shapes" as const,
        skillLevel: "beginner" as const
      };

      const result = FashionFunctions.getIllustratorHelp(params);

      expect(result).toHaveProperty("stepByStep");
      expect(result.stepByStep).toBeInstanceOf(Array);
    });
  });
});