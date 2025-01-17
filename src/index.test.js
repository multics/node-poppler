/* eslint-disable jest/no-conditional-expect */
/* eslint-disable security/detect-non-literal-fs-filename */
const fs = require("fs/promises");
const { glob } = require("glob");
const path = require("upath");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);
const { Poppler } = require("./index");

const testDirectory = `${__dirname}/../test_files/`;
const file = `${testDirectory}pdf_1.3_NHS_Constitution.pdf`;

let testBinaryPath;
switch (process.platform) {
	// macOS
	case "darwin":
		testBinaryPath = "/usr/local/bin";
		break;

	case "linux":
		testBinaryPath = "/usr/bin";
		break;

	// Windows OS
	case "win32":
	default:
		testBinaryPath = path.joinSafe(
			__dirname,
			"lib",
			"win32",
			"poppler-23.01.0",
			"Library",
			"bin"
		);
		break;
}

describe("Node-Poppler module", () => {
	afterEach(async () => {
		// Remove leftover test files
		const files = await glob(`${testDirectory}**/*`, {
			ignore: [
				`${testDirectory}/pdf_1.3_NHS_Constitution_attached_detach.pdf`,
				`${testDirectory}/pdf_1.3_NHS_Constitution.pdf`,
				`${testDirectory}/pdf_1.7_NHS_Constitution_Handbook.pdf`,
				`${testDirectory}/test.txt`,
			],
		});

		await Promise.all(files.map((filed) => fs.unlink(filed)));
	});

	describe("Constructor", () => {
		if (process.platform === "win32") {
			it("Converts PDF file to SVG file without binary path set on win32, and use included binaries", async () => {
				const poppler = new Poppler();
				const options = {
					svgFile: true,
				};
				const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution.svg`;

				const res = await poppler.pdfToCairo(file, outputFile, options);

				expect(res).toBe("No Error");
				await expect(fs.access(outputFile)).resolves.toBeUndefined();
			});
		}

		if (process.platform !== "win32") {
			it(`Returns an Error object if binary path unset on ${process.platform}`, async () => {
				expect.assertions(1);
				try {
					// eslint-disable-next-line no-unused-vars
					const poppler = new Poppler();
				} catch (err) {
					expect(err.message).toBe(
						`${process.platform} poppler-util binaries are not provided, please pass the installation directory as a parameter to the Poppler instance.`
					);
				}
			});
		}
	});

	describe("pdfAttach function", () => {
		it("Attachs file to PDF file", async () => {
			const poppler = new Poppler(testBinaryPath);
			const attachmentFile = `${testDirectory}test.txt`;
			const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution_attached.pdf`;

			const res = await poppler.pdfAttach(
				file,
				attachmentFile,
				outputFile
			);

			expect(typeof res).toBe("string");
			await expect(
				fs.access(
					`${testDirectory}pdf_1.3_NHS_Constitution_attached.pdf`
				)
			).resolves.toBeUndefined();
		});

		it("Returns an Error object if file passed not PDF format", async () => {
			const poppler = new Poppler(testBinaryPath);
			const testTxtFile = `${testDirectory}test.txt`;

			expect.assertions(1);
			await poppler.pdfAttach(testTxtFile).catch((err) => {
				expect(err.message).toMatch(/^Command failed:/);
			});
		});

		it("Returns an Error object if invalid value types provided for an option are passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				replace: "test",
			};

			await expect(
				poppler.pdfAttach(file, undefined, undefined, options)
			).rejects.toThrow(
				"Invalid value type provided for option 'replace', expected boolean but received string"
			);
		});

		it("Returns an Error object if invalid option is passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				wordFile: "test",
			};

			await expect(
				poppler.pdfAttach(file, undefined, undefined, options)
			).rejects.toThrow("Invalid option provided 'wordFile'");
		});
	});

	describe("pdfDetach function", () => {
		it("Lists embedded files", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				listEmbedded: true,
			};
			const attachmentFile = `${testDirectory}pdf_1.3_NHS_Constitution_attached_detach.pdf`;

			const res = await poppler.pdfDetach(attachmentFile, options);

			expect(res).toMatch("1 embedded files");
		});

		it("Returns an Error object if file passed not PDF format", async () => {
			const poppler = new Poppler(testBinaryPath);
			const testTxtFile = `${testDirectory}test.txt`;

			expect.assertions(1);
			await poppler.pdfDetach(testTxtFile).catch((err) => {
				expect(err.message).toMatch(/^Command failed:/);
			});
		});

		it("Returns an Error object if invalid value types provided for an option are passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				listEmbedded: "test",
			};

			await expect(poppler.pdfDetach(file, options)).rejects.toThrow(
				"Invalid value type provided for option 'listEmbedded', expected boolean but received string"
			);
		});

		it("Returns an Error object if invalid option is passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				wordFile: "test",
			};

			await expect(poppler.pdfDetach(file, options)).rejects.toThrow(
				"Invalid option provided 'wordFile'"
			);
		});
	});

	describe("pdfFonts function", () => {
		it("Examines 3 pages of PDF file", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				firstPageToExamine: 1,
				lastPageToExamine: 3,
			};
			const res = await poppler.pdfFonts(file, options);

			expect(res).toMatch("+Frutiger-");
		});

		it("Examines 3 pages of PDF file as Buffer", async () => {
			const poppler = new Poppler(testBinaryPath);
			const attachmentFile = await fs.readFile(file);

			const options = {
				firstPageToExamine: 1,
				lastPageToExamine: 3,
			};
			const res = await poppler.pdfFonts(attachmentFile, options);

			expect(res).toMatch("+Frutiger-");
		});

		it("Returns an Error object if file passed not PDF format", async () => {
			const poppler = new Poppler(testBinaryPath);
			const testTxtFile = `${testDirectory}test.txt`;

			expect.assertions(1);
			await poppler.pdfFonts(testTxtFile).catch((err) => {
				expect(err.message).toMatch(/^Syntax Warning:/);
			});
		});

		it("Returns an Error object if invalid value types provided for an option are passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				firstPageToExamine: "test",
			};

			await expect(poppler.pdfFonts(file, options)).rejects.toThrow(
				"Invalid value type provided for option 'firstPageToExamine', expected number but received string"
			);
		});

		it("Returns an Error object if invalid option is passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				wordFile: "test",
			};

			await expect(poppler.pdfFonts(file, options)).rejects.toThrow(
				"Invalid option provided 'wordFile'"
			);
		});
	});

	describe("pdfImages function", () => {
		it("Accepts options and list all images in PDF file", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				list: true,
			};

			const res = await poppler.pdfImages(file, undefined, options);

			expect(res).toMatch("page");
		});

		it("Accepts options and save images from PDF file", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				pngFile: true,
			};

			const res = await poppler.pdfImages(file, "file_prefix", options);

			expect(res).toBe("No Error");
		});

		it("Accepts options and list all images in PDF file as Buffer", async () => {
			const poppler = new Poppler(testBinaryPath);
			const attachmentFile = await fs.readFile(file);
			const options = {
				list: true,
			};

			const res = await poppler.pdfImages(
				attachmentFile,
				undefined,
				options
			);

			expect(res).toMatch("page");
		});

		it("Returns an Error object if file passed not PDF format", async () => {
			const poppler = new Poppler(testBinaryPath);
			const testTxtFile = `${testDirectory}test.txt`;

			expect.assertions(1);
			await poppler.pdfImages(testTxtFile, `file_prefix`).catch((err) => {
				expect(err.message).toMatch(/^Syntax Warning:/);
			});
		});

		it("Returns an Error object if PDF file missing", async () => {
			const poppler = new Poppler(testBinaryPath);

			expect.assertions(1);
			await poppler.pdfImages(undefined, `file_prefix`).catch((err) => {
				expect(err.message).toMatch(
					/^I\/O Error: Couldn't open file 'undefined'/
				);
			});
		});

		it("Returns an Error object if invalid value types provided for an option are passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				firstPageToConvert: "test",
				lastPageToConvert: "test",
			};

			await expect(
				poppler.pdfImages(undefined, undefined, options)
			).rejects.toThrow(
				"Invalid value type provided for option 'firstPageToConvert', expected number but received string; Invalid value type provided for option 'lastPageToConvert', expected number but received string"
			);
		});

		it("Returns an Error object if invalid option is passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				middlePageToConvert: "test",
			};

			await expect(
				poppler.pdfImages(undefined, undefined, options)
			).rejects.toThrow("Invalid option provided 'middlePageToConvert'");
		});
	});

	describe("pdfInfo function", () => {
		const pdfInfoObject = {
			tagged: "yes",
			userProperties: "no",
			suspects: "no",
			form: "AcroForm",
			javaScript: "no",
			pages: "16",
			encrypted: "no",
			pageSize: "595.276 x 841.89 pts (A4)",
			pageRot: "0",
			fileSize: "583094 bytes",
			optimized: "no",
			pdfVersion: "1.3",
		};

		it("Lists info of PDF file", async () => {
			const poppler = new Poppler(testBinaryPath);

			const res = await poppler.pdfInfo(file);

			expect(res).toMatch("Pages:");
		});

		it("Lists info of PDF file as a JSON object", async () => {
			const poppler = new Poppler(testBinaryPath);

			const res = await poppler.pdfInfo(file, {
				printAsJson: true,
			});

			expect(res).toMatchObject(pdfInfoObject);
		});

		it("Lists info of PDF file as Buffer", async () => {
			const poppler = new Poppler(testBinaryPath);
			const attachmentFile = await fs.readFile(file);

			const res = await poppler.pdfInfo(attachmentFile);

			expect(res).toMatch("Pages:");
		});

		it("Lists info of PDF file as Buffer as a JSON object", async () => {
			const poppler = new Poppler(testBinaryPath);
			const attachmentFile = await fs.readFile(file);

			const res = await poppler.pdfInfo(attachmentFile, {
				printAsJson: true,
			});

			expect(res).toMatchObject(pdfInfoObject);
		});

		it("Returns an Error object if file passed not PDF format", async () => {
			const poppler = new Poppler(testBinaryPath);
			const testTxtFile = `${testDirectory}test.txt`;

			expect.assertions(1);
			await poppler.pdfInfo(testTxtFile).catch((err) => {
				expect(err.message).toMatch(/^Syntax Warning:/);
			});
		});

		it("Returns an Error object if PDF file missing", async () => {
			const poppler = new Poppler(testBinaryPath);

			expect.assertions(1);
			await poppler.pdfInfo().catch((err) => {
				expect(err.message).toMatch(/^I\/O Error:/);
			});
		});

		it("Returns an Error object if invalid value types provided for an option are passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				firstPageToConvert: "test",
			};

			await expect(poppler.pdfInfo(file, options)).rejects.toThrow(
				"Invalid value type provided for option 'firstPageToConvert', expected number but received string"
			);
		});

		it("Returns an Error object if invalid option is passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				wordFile: "test",
			};

			await expect(poppler.pdfInfo(file, options)).rejects.toThrow(
				"Invalid option provided 'wordFile'"
			);
		});
	});

	describe("pdfSeparate function", () => {
		it("Extracts 3 pages from PDF file to new files", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				firstPageToExtract: 1,
				lastPageToExtract: 3,
			};
			const outputPattern = `${testDirectory}pdf_1.3_NHS_Constitution-extract-%d.pdf`;

			const res = await poppler.pdfSeparate(file, outputPattern, options);

			expect(typeof res).toBe("string");

			await expect(
				fs.access(
					`${testDirectory}pdf_1.3_NHS_Constitution-extract-1.pdf`
				)
			).resolves.toBeUndefined();
			await expect(
				fs.access(
					`${testDirectory}pdf_1.3_NHS_Constitution-extract-2.pdf`
				)
			).resolves.toBeUndefined();
			await expect(
				fs.access(
					`${testDirectory}pdf_1.3_NHS_Constitution-extract-3.pdf`
				)
			).resolves.toBeUndefined();
		});

		it("Returns an Error object if file passed not PDF format", async () => {
			const poppler = new Poppler(testBinaryPath);
			const testTxtFile = `${testDirectory}test.txt`;

			expect.assertions(1);
			await poppler.pdfSeparate(testTxtFile).catch((err) => {
				expect(err.message).toMatch(/^Command failed:/);
			});
		});

		it("Returns an Error object if invalid value types provided for an option are passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				firstPageToExtract: "test",
			};

			await expect(
				poppler.pdfSeparate(file, undefined, options)
			).rejects.toThrow(
				"Invalid value type provided for option 'firstPageToExtract', expected number but received string"
			);
		});

		it("Returns an Error object if invalid option is passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				wordFile: "test",
			};

			await expect(
				poppler.pdfSeparate(file, undefined, options)
			).rejects.toThrow("Invalid option provided 'wordFile'");
		});
	});

	describe("pdfToCairo function", () => {
		describe("PDF-to-EPS option", () => {
			it("Converts PDF file to EPS file", async () => {
				const poppler = new Poppler(testBinaryPath);
				const options = {
					epsFile: true,
					firstPageToConvert: 1,
					lastPageToConvert: 1,
				};
				const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution.eps`;

				const res = await poppler.pdfToCairo(file, outputFile, options);

				expect(res).toBe("No Error");
				await expect(fs.access(outputFile)).resolves.toBeUndefined();
			});

			it("Converts PDF file to EPS file and send to stdout", async () => {
				const poppler = new Poppler(testBinaryPath);
				const options = {
					epsFile: true,
					firstPageToConvert: 1,
					lastPageToConvert: 1,
				};

				const res = await poppler.pdfToCairo(file, undefined, options);

				expect(typeof res).toBe("string");
			});

			it("Converts PDF file as Buffer to EPS file", async () => {
				const poppler = new Poppler(testBinaryPath);
				const attachmentFile = await fs.readFile(file);
				const options = {
					epsFile: true,
					firstPageToConvert: 1,
					lastPageToConvert: 1,
				};
				const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution.eps`;

				const res = await poppler.pdfToCairo(
					attachmentFile,
					outputFile,
					options
				);

				expect(res).toBe("No Error");
				await expect(fs.access(outputFile)).resolves.toBeUndefined();
			});
		});

		describe("PDF-to-JPG option", () => {
			it("Converts PDF file to JPG file", async () => {
				const poppler = new Poppler(testBinaryPath);
				const options = {
					jpegFile: true,
				};
				const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution`;

				const res = await poppler.pdfToCairo(file, outputFile, options);

				expect(res).toBe("No Error");
				await expect(
					fs.access(`${outputFile}-01.jpg`)
				).resolves.toBeUndefined();
			});

			it("Converts PDF file to JPG file and send to stdout", async () => {
				const poppler = new Poppler(testBinaryPath);
				const options = {
					jpegFile: true,
					singleFile: true,
				};

				const res = await poppler.pdfToCairo(file, undefined, options);

				expect(typeof res).toBe("string");
			});

			it("Converts PDF file as Buffer to JPG file", async () => {
				const poppler = new Poppler(testBinaryPath);
				const attachmentFile = await fs.readFile(file);
				const options = {
					jpegFile: true,
				};
				const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution`;

				const res = await poppler.pdfToCairo(
					attachmentFile,
					outputFile,
					options
				);

				expect(res).toBe("No Error");
				await expect(
					fs.access(`${outputFile}-01.jpg`)
				).resolves.toBeUndefined();
			});
		});

		describe("PDF-to-PDF option", () => {
			it("Converts PDF file to PDF file", async () => {
				const poppler = new Poppler(testBinaryPath);
				const options = {
					pdfFile: true,
				};
				const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution_cairo.pdf`;

				const res = await poppler.pdfToCairo(file, outputFile, options);

				expect(res).toBe("No Error");
				await expect(fs.access(outputFile)).resolves.toBeUndefined();
			});

			it("Converts PDF file to PDF file and send to stdout", async () => {
				const poppler = new Poppler(testBinaryPath);
				const options = {
					pdfFile: true,
				};

				const res = await poppler.pdfToCairo(file, undefined, options);

				expect(typeof res).toBe("string");
			});

			it("Converts PDF file as Buffer to PDF file", async () => {
				const poppler = new Poppler(testBinaryPath);
				const attachmentFile = await fs.readFile(file);
				const options = {
					pdfFile: true,
				};
				const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution_cairo.pdf`;

				const res = await poppler.pdfToCairo(
					attachmentFile,
					outputFile,
					options
				);

				expect(res).toBe("No Error");
				await expect(fs.access(outputFile)).resolves.toBeUndefined();
			});
		});

		describe("PDF-to-PNG option", () => {
			it("Converts PDF file to PNG file", async () => {
				const poppler = new Poppler(testBinaryPath);
				const options = {
					pngFile: true,
				};
				const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution`;

				const res = await poppler.pdfToCairo(file, outputFile, options);

				expect(res).toBe("No Error");
				await expect(
					fs.access(`${outputFile}-01.png`)
				).resolves.toBeUndefined();
			});

			it("Converts PDF file to PNG file and send to stdout", async () => {
				const poppler = new Poppler(testBinaryPath);
				const options = {
					pngFile: true,
					singleFile: true,
				};

				const res = await poppler.pdfToCairo(file, undefined, options);

				expect(typeof res).toBe("string");
			});

			it("Converts PDF file as Buffer to PNG file", async () => {
				const poppler = new Poppler(testBinaryPath);
				const attachmentFile = await fs.readFile(file);
				const options = {
					pngFile: true,
				};
				const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution`;

				const res = await poppler.pdfToCairo(
					attachmentFile,
					outputFile,
					options
				);

				expect(res).toBe("No Error");
				await expect(
					fs.access(`${outputFile}-01.png`)
				).resolves.toBeUndefined();
			});
		});

		describe("PDF-to-PS option", () => {
			it("Converts PDF file to PS file", async () => {
				const poppler = new Poppler(testBinaryPath);
				const options = {
					psFile: true,
				};
				const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution.ps`;

				const res = await poppler.pdfToCairo(file, outputFile, options);

				expect(res).toBe("No Error");
				await expect(fs.access(outputFile)).resolves.toBeUndefined();
			});

			it("Converts PDF file to PS file and send to stdout", async () => {
				const poppler = new Poppler(testBinaryPath);
				const options = {
					psFile: true,
				};

				const res = await poppler.pdfToCairo(file, undefined, options);

				expect(typeof res).toBe("string");
			});

			it("Converts PDF file as Buffer to PS file", async () => {
				const poppler = new Poppler(testBinaryPath);
				const attachmentFile = await fs.readFile(file);
				const options = {
					psFile: true,
				};
				const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution.ps`;

				const res = await poppler.pdfToCairo(
					attachmentFile,
					outputFile,
					options
				);

				expect(res).toBe("No Error");
				await expect(fs.access(outputFile)).resolves.toBeUndefined();
			});
		});

		describe("PDF-to-SVG option", () => {
			it("Converts PDF file to SVG file", async () => {
				const poppler = new Poppler(testBinaryPath);
				const options = {
					svgFile: true,
				};
				const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution.svg`;

				const res = await poppler.pdfToCairo(file, outputFile, options);

				expect(res).toBe("No Error");
				await expect(fs.access(outputFile)).resolves.toBeUndefined();
			});

			it("Converts PDF file to SVG file and send to stdout", async () => {
				const poppler = new Poppler(testBinaryPath);
				const options = {
					svgFile: true,
				};

				const res = await poppler.pdfToCairo(file, undefined, options);

				expect(typeof res).toBe("string");
			});

			it("Converts PDF file as Buffer to SVG file", async () => {
				const poppler = new Poppler(testBinaryPath);
				const attachmentFile = await fs.readFile(file);
				const options = {
					svgFile: true,
				};
				const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution.svg`;

				const res = await poppler.pdfToCairo(
					attachmentFile,
					outputFile,
					options
				);

				expect(res).toBe("No Error");
				await expect(fs.access(outputFile)).resolves.toBeUndefined();
			});
		});

		describe("PDF-to-TIFF option", () => {
			it("Converts PDF file to TIFF file", async () => {
				const poppler = new Poppler(testBinaryPath);
				const options = {
					tiffFile: true,
				};
				const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution`;

				const res = await poppler.pdfToCairo(file, outputFile, options);

				expect(res).toBe("No Error");
				await expect(
					fs.access(`${outputFile}-01.tif`)
				).resolves.toBeUndefined();
			});

			it("Converts PDF file to TIFF file and send to stdout", async () => {
				const poppler = new Poppler(testBinaryPath);
				const options = {
					singleFile: true,
					tiffFile: true,
				};

				const res = await poppler.pdfToCairo(file, undefined, options);

				expect(typeof res).toBe("string");
			});

			it("Converts PDF file as Buffer to TIFF file", async () => {
				const poppler = new Poppler(testBinaryPath);
				const attachmentFile = await fs.readFile(file);
				const options = {
					tiffFile: true,
				};
				const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution`;

				const res = await poppler.pdfToCairo(
					attachmentFile,
					outputFile,
					options
				);

				expect(res).toBe("No Error");
				await expect(
					fs.access(`${outputFile}-01.tif`)
				).resolves.toBeUndefined();
			});
		});

		it("Accepts options and only process 2 pages of PDF file", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				firstPageToConvert: 1,
				lastPageToConvert: 2,
				svgFile: true,
			};
			const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution.svg`;

			const res = await poppler.pdfToCairo(file, outputFile, options);

			expect(res).toBe("No Error");
			await expect(fs.access(outputFile)).resolves.toBeUndefined();
		});

		it("Returns an Error object if file passed not PDF format", async () => {
			const poppler = new Poppler(testBinaryPath);
			const testTxtFile = `${testDirectory}test.txt`;

			expect.assertions(1);
			await poppler.pdfToCairo(testTxtFile).catch((err) => {
				expect(err.message).toMatch(/Error:/);
			});
		});

		it("Returns an Error object if no format option is passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);

			expect.assertions(1);
			await poppler.pdfToCairo(file).catch((err) => {
				expect(err.message).toMatch(/Error:/);
			});
		});

		it("Returns an Error object if invalid value types provided for an option are passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				pdfFile: "test",
			};

			await expect(
				poppler.pdfToCairo(file, undefined, options)
			).rejects.toThrow(
				"Invalid value type provided for option 'pdfFile', expected boolean but received string"
			);
		});

		it("Returns an Error object if invalid option is passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				wordFile: "test",
			};

			await expect(
				poppler.pdfToCairo(file, undefined, options)
			).rejects.toThrow("Invalid option provided 'wordFile'");
		});
	});

	describe("pdfToHtml function", () => {
		it("Converts PDF file to HTML file", async () => {
			const poppler = new Poppler(testBinaryPath);

			const res = await poppler.pdfToHtml(file);

			expect(res).toMatch("Page-16");
			await expect(
				fs.access(`${testDirectory}pdf_1.3_NHS_Constitution.html`)
			).resolves.toBeUndefined();
		});

		it("Converts PDF file to HTML file as Buffer", async () => {
			const poppler = new Poppler(testBinaryPath);
			const attachmentFile = await fs.readFile(file);

			const res = await poppler.pdfToHtml(
				attachmentFile,
				`${testDirectory}pdf_1.3_NHS_Constitution.html`
			);

			expect(res).toMatch("Page-16");
			await expect(
				fs.access(`${testDirectory}pdf_1.3_NHS_Constitution.html`)
			).resolves.toBeUndefined();
		});

		it("Accepts options and only process 2 pages of PDF file", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				firstPageToConvert: 1,
				lastPageToConvert: 2,
			};

			const res = await poppler.pdfToHtml(file, undefined, options);

			expect(res).toMatch("Page-2");
			await expect(
				fs.access(`${testDirectory}pdf_1.3_NHS_Constitution.html`)
			).resolves.toBeUndefined();
		});

		it("Returns an Error object if file passed not PDF format", async () => {
			const poppler = new Poppler(testBinaryPath);
			const testTxtFile = `${testDirectory}test.txt`;

			expect.assertions(1);
			await poppler.pdfToHtml(testTxtFile).catch((err) => {
				expect(err.message).toMatch(/^Syntax Warning:/);
			});
		});

		it("Returns an Error object if PDF file missing", async () => {
			const poppler = new Poppler(testBinaryPath);

			expect.assertions(1);
			await poppler.pdfToHtml().catch((err) => {
				expect(err.message).toMatch(/^I\/O Error:/);
			});
		});

		it("Returns an Error object if invalid value types provided for an option are passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				firstPageToConvert: "test",
				lastPageToConvert: "test",
			};

			await expect(
				poppler.pdfToHtml(file, undefined, options)
			).rejects.toThrow(
				"Invalid value type provided for option 'firstPageToConvert', expected number but received string; Invalid value type provided for option 'lastPageToConvert', expected number but received string"
			);
		});

		it("Returns an Error object if invalid option is passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				middlePageToConvert: "test",
			};

			await expect(
				poppler.pdfToHtml(file, undefined, options)
			).rejects.toThrow("Invalid option provided 'middlePageToConvert'");
		});
	});

	describe("pdfToPpm function", () => {
		let version;

		beforeAll(async () => {
			const { stderr } = await execFileAsync(
				path.joinSafe(testBinaryPath, "pdftoppm"),
				["-v"]
			);
			version = /(\d{1,2}\.\d{1,2}\.\d{1,2})/i.exec(stderr)[1];
		});

		it("Accepts options and only process 1 page of PDF file", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				firstPageToConvert: 1,
				lastPageToConvert: 1,
			};

			const res = await poppler.pdfToPpm(
				file,
				`${testDirectory}pdf_1.3_NHS_Constitution`,
				options
			);

			expect(res).toBe("No Error");
			await expect(
				fs.access(`${testDirectory}pdf_1.3_NHS_Constitution-01.ppm`)
			).resolves.toBeUndefined();
		});

		it("Accepts options and only process 1 page of PDF file as Buffer", async () => {
			const poppler = new Poppler(testBinaryPath);
			const attachmentFile = await fs.readFile(file);
			const options = {
				firstPageToConvert: 1,
				lastPageToConvert: 1,
			};

			const res = await poppler.pdfToPpm(
				attachmentFile,
				`${testDirectory}pdf_1.3_NHS_Constitution`,
				options
			);

			expect(res).toBe("No Error");
			await expect(
				fs.access(`${testDirectory}pdf_1.3_NHS_Constitution-01.ppm`)
			).resolves.toBeUndefined();
		});

		it("Returns an Error object if file passed not PDF format", async () => {
			const poppler = new Poppler(testBinaryPath);
			const testTxtFile = `${testDirectory}test.txt`;

			expect.assertions(1);
			await poppler.pdfToPpm(testTxtFile).catch((err) => {
				expect(err.message).toMatch(/^Syntax Warning:/);
			});
		});

		it("Returns an Error object if PDF file missing", async () => {
			const poppler = new Poppler(testBinaryPath);

			expect.assertions(1);
			await poppler.pdfToPpm().catch((err) => {
				expect(err.message).toMatch(/^I\/O Error:/);
			});
		});

		it("Returns an Error object if invalid value types provided for an option are passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				firstPageToConvert: "test",
				lastPageToConvert: "test",
			};

			await expect(
				poppler.pdfToPpm(undefined, undefined, options)
			).rejects.toThrow(
				"Invalid value type provided for option 'firstPageToConvert', expected number but received string; Invalid value type provided for option 'lastPageToConvert', expected number but received string"
			);
		});

		it("Returns an Error object if option provided is only available in a later version of the pdftoppm binary than what was provided", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				printProgress: true,
			};

			if (version < "21.03.0") {
				await expect(
					poppler.pdfToPpm(
						file,
						`${testDirectory}pdf_1.3_NHS_Constitution`,
						options
					)
				).rejects.toThrow(
					`Invalid option provided for the current version of the binary used. 'printProgress' was introduced in v21.03.0, but received v${version}`
				);
			}
		});

		it("Returns an Error object if invalid option is passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				middlePageToConvert: "test",
			};

			await expect(
				poppler.pdfToPpm(undefined, undefined, options)
			).rejects.toThrow("Invalid option provided 'middlePageToConvert'");
		});
	});

	describe("pdfToPs function", () => {
		it("Converts PDF file to PS file and write to output file", async () => {
			const poppler = new Poppler(testBinaryPath);
			const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution.ps`;

			const res = await poppler.pdfToPs(file, outputFile);

			expect(res).toBe("No Error");
			await expect(fs.access(outputFile)).resolves.toBeUndefined();
		});

		it("Converts PDF file as Buffer to PS file", async () => {
			const poppler = new Poppler(testBinaryPath);
			const attachmentFile = await fs.readFile(file);

			const res = await poppler.pdfToPs(attachmentFile);

			expect(typeof res).toBe("string");
		});

		it("Accepts options and only process 2 pages of PDF file", async () => {
			const poppler = new Poppler(testBinaryPath);
			const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution.ps`;
			const options = {
				firstPageToConvert: 1,
				lastPageToConvert: 2,
			};

			const res = await poppler.pdfToPs(file, outputFile, options);

			expect(res).toBe("No Error");
			await expect(fs.access(outputFile)).resolves.toBeUndefined();
		});

		it("Returns an Error object if file passed not PDF format", async () => {
			const poppler = new Poppler(testBinaryPath);
			const testTxtFile = `${testDirectory}test.txt`;

			expect.assertions(1);
			await poppler.pdfToPs(testTxtFile).catch((err) => {
				expect(err.message).toMatch(/^Syntax Warning:/);
			});
		});

		it("Returns an Error object if PDF file missing", async () => {
			const poppler = new Poppler(testBinaryPath);

			expect.assertions(1);
			await poppler.pdfToPs().catch((err) => {
				expect(err.message).toMatch(/^I\/O Error:/);
			});
		});

		it("Returns an Error object if invalid value types provided for an option are passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				firstPageToConvert: "test",
				lastPageToConvert: "test",
			};

			expect.assertions(1);
			await poppler.pdfToPs(file, undefined, options).catch((err) => {
				expect(err.message).toBe(
					"Invalid value type provided for option 'firstPageToConvert', expected number but received string; Invalid value type provided for option 'lastPageToConvert', expected number but received string"
				);
			});
		});

		it("Returns an Error object if invalid option is passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				middlePageToConvert: "test",
			};

			await expect(
				poppler.pdfToPs(file, undefined, options)
			).rejects.toThrow("Invalid option provided 'middlePageToConvert'");
		});
	});

	describe("pdfToText function", () => {
		it("Converts PDF file to Text file and write to output file", async () => {
			const poppler = new Poppler(testBinaryPath);
			const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution.txt`;

			const res = await poppler.pdfToText(file, outputFile);

			expect(res).toBe("No Error");
			await expect(fs.access(outputFile)).resolves.toBeUndefined();
		});

		it("Converts PDF file as Buffer to Text file", async () => {
			const poppler = new Poppler(testBinaryPath);
			const attachmentFile = await fs.readFile(file);

			const res = await poppler.pdfToText(attachmentFile);

			expect(res).toMatch("The NHS Constitution");
		});

		it("Accepts options and only process 2 pages of PDF file", async () => {
			const poppler = new Poppler(testBinaryPath);
			const outputFile = `${testDirectory}pdf_1.3_NHS_Constitution.txt`;
			const options = {
				firstPageToConvert: 1,
				lastPageToConvert: 2,
			};

			const res = await poppler.pdfToText(file, outputFile, options);

			expect(res).toBe("No Error");
			await expect(fs.access(outputFile)).resolves.toBeUndefined();
		});

		it("Returns an Error object if file passed not PDF format", async () => {
			const poppler = new Poppler(testBinaryPath);
			const testTxtFile = `${testDirectory}test.txt`;

			expect.assertions(1);
			await poppler.pdfToText(testTxtFile).catch((err) => {
				expect(err.message).toMatch(/^Syntax Warning:/);
			});
		});

		it("Returns an Error object if PDF file missing", async () => {
			const poppler = new Poppler(testBinaryPath);

			expect.assertions(1);
			await poppler.pdfToText().catch((err) => {
				expect(err.message).toMatch(/^I\/O Error:/);
			});
		});

		it("Returns an Error object if invalid value types provided for an option are passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				firstPageToConvert: "test",
				lastPageToConvert: "test",
			};

			expect.assertions(1);
			await poppler.pdfToText(file, undefined, options).catch((err) => {
				expect(err.message).toBe(
					"Invalid value type provided for option 'firstPageToConvert', expected number but received string; Invalid value type provided for option 'lastPageToConvert', expected number but received string"
				);
			});
		});

		it("Returns an Error object if invalid option is passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const options = {
				middlePageToConvert: "test",
			};

			await expect(
				poppler.pdfToText(file, undefined, options)
			).rejects.toThrow("Invalid option provided 'middlePageToConvert'");
		});
	});

	describe("pdfUnite function", () => {
		it("Merges two separate PDF files into a new single PDF file", async () => {
			const poppler = new Poppler(testBinaryPath);
			const files = [
				file,
				`${testDirectory}pdf_1.7_NHS_Constitution_Handbook.pdf`,
			];
			const outputFile = `${testDirectory}united.pdf`;

			const res = await poppler.pdfUnite(files, outputFile);

			expect(typeof res).toBe("string");
			await expect(fs.access(outputFile)).resolves.toBeUndefined();
		});

		it("Returns an Error object if a PDF file and non-PDF file are attempted to be merged", async () => {
			const poppler = new Poppler(testBinaryPath);
			const files = [
				`${testDirectory}test.txt`,
				`${testDirectory}pdf_1.7_NHS_Constitution_Handbook.pdf`,
			];

			expect.assertions(1);
			await poppler.pdfUnite(files).catch((err) => {
				expect(err.message).toMatch(/^Command failed:/);
			});
		});

		it("Returns an Error object if invalid value types provided for an option are passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const files = [
				file,
				`${testDirectory}pdf_1.7_NHS_Constitution_Handbook.pdf`,
			];
			const options = {
				printVersionInfo: "test",
			};

			await expect(
				poppler.pdfUnite(files, undefined, options)
			).rejects.toThrow(
				"Invalid value type provided for option 'printVersionInfo', expected boolean but received string"
			);
		});

		it("Returns an Error object if invalid option is passed to function", async () => {
			const poppler = new Poppler(testBinaryPath);
			const files = [
				file,
				`${testDirectory}pdf_1.7_NHS_Constitution_Handbook.pdf`,
			];
			const options = {
				wordFile: "test",
			};

			await expect(
				poppler.pdfUnite(files, undefined, options)
			).rejects.toThrow("Invalid option provided 'wordFile'");
		});
	});
});
