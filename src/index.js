function casHandler(str, value) {
	var casArr = str.split('.');
	var casObj = {};

	if (casArr.length == 0) {
		casObj[str] = value;
	}

	casArr.reverse().forEach(function(cas) {
		if (cas.indexOf('[') == -1) {
			casObj[cas] = value;
		} else {
			var newCasObj = {};
			var key = cas.split('[')[0];
			newCasObj[key] = [casObj];
			casObj = newCasObj;
		}
	});
	return casObj;
}

module.exports = function(layoutData, options) {
	const renderData = {};
	const prettier = options.prettier;
	const _ = options._;
	const raxImport = {};
	const style = {};
	let mock = {};

	function json2jsx(json) {
		var result = '';
		mock = generateMockData(mock);

		if (!!json.length && typeof json != 'string') {
			json.forEach(function(node) {
				result += json2jsx(node);
			});
		} else if (typeof json == 'object') {
			var type = json.componentType;
			var className = json.attrs.className;

			switch (type) {
				case 'text':
					var lines = json.style.lines;
					var innerText;

					if (json.tpl) {
						innerText = `{dataSource.${json.tpl}}`;
						mock = _.merge(mock, casHandler(json.tpl, json.innerText));
					} else {
						innerText = json.innerText;
					}

					result += `<Text style={styles.${className}} numberOfLines={${lines}}>${innerText}</Text>`;

					if (!raxImport[type]) {
						raxImport[type] = `import {Text} from 'react-native';`;
					}

					if (json.style.lines == 1) {
						delete json.style.width;
						delete json.style.height;
					}

					if (json.style.lineHeight) {
						var lineHeight = json.style.lineHeight;
						lineHeight = lineHeight.replace(/(rem)|(px)/, '');
						json.style.lineHeight = Number(lineHeight);
					}
					if (json.style.fontWeight) {
						var fontWeight = json.style.fontWeight;
						json.style.fontWeight = fontWeight + '';

					}

					delete json.style.lines;
					delete json.style.fontFamily;
					delete json.style.whiteSpace;
					delete json.style.textOverflow;
					delete json.style.letterSpacing;
					break;
				case 'view':
					if (json.children && json.children.length > 0) {
						result += `<View style={styles.${className}}>${json2jsx(
              json.children
            )}</View>`;
					} else {
						result += `<View style={styles.${className}} />`;
					}
					if (!raxImport[type]) {
						raxImport[type] = `import {View} from 'react-native';`;
					}

					delete json.style.display;
					delete json.style.boxSizing;
					delete json.style.boxShadow;
					delete json.style.backgroundImage;
					break;
				case 'picture':
					var source;

					if (json.tpl) {
						source = `dataSource.${json.tpl}`;
						mock = _.merge(mock, casHandler(json.tpl, json.attrs.src));
					} else {
						source = `'${json.attrs.src}'`;
					}
					result += `<Image resizeMod={'contain'} style={styles.${className}} source={{uri: ${source}}} />`;

					if (!raxImport[type]) {
						raxImport[type] = `import {Image} from 'react-native';`;
					}
					break;
			}

			style[className] = json.style;
		} else {
			return json
				.toString()
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;');
		}

		return result;
	}


	function generateMockData(mockData) {
		let targetMockObject = {};
		for (let _o in mockData) {
			targetMockObject[_o] = _deepMock({}, mockData[_o]);
		}
		return targetMockObject;
	}

	function _deepMock(targetObj, sourceObj) {
		let targetObjStore = targetObj;
		for (let _o in sourceObj) {
			let _oArr = _utilsStringToArr(_o);
			let _len = _oArr.length;
			_oArr.forEach((_v, _i) => {
				if (_i == _len - 1) {
					targetObj[_v] = sourceObj[_o];
				} else {
					targetObj[_v] = {};
					targetObj = targetObj[_v];
				}
			});
			targetObj = targetObjStore;
		}
		return targetObjStore;
	}

	function _utilsStringToArr(string) {
		let arr = [];
		string = string.replace(/\]/g, '');
		string = string.replace(/\]/g, '.');
		arr = string.split('.');
		return arr;
	}


	// transform json
	var jsx = `${json2jsx(layoutData)}`;
	var dataBinding =
		Object.keys(mock).length > 0 ?
		'var dataSource = this.props.dataSource;' :
		'';

	renderData.modClass = `
    class Mod extends React.Component {
      render() {
        ${dataBinding}
        return (
          ${jsx}
        );
      }
    }
  `;

	renderData.import = Object.keys(raxImport)
		.map(key => {
			return raxImport[key];
		})
		.join('\n');
	renderData.mockData = `var mock = ${JSON.stringify(mock)}`;
	renderData.export = `render(<Mod dataSource={mock} />);`;
	renderData.style = `const styles = StyleSheet.create(${JSON.stringify(style)});`;

	const prettierOpt = {
		printWidth: 120,
		singleQuote: true
	};

	return {
		renderData: renderData,
		xml: prettier.format(jsx, prettierOpt),
		style: prettier.format(renderData.style, prettierOpt),
		prettierOpt: prettierOpt
	};
};